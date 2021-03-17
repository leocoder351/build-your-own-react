function createElement(type, config, ...children) {
  let childrenCount = children.length;
  let props = Object.assign({}, config);

  if (childrenCount === 1) {
    props.children = children[0];
  } else if (childrenCount > 0) {
    props.children = children.slice(0);
  }

  return {
    type,
    props
  }
}

class Component {
  get isReactComponent () {
    console.log('get isReactComponent');
    return true;
  }
}

function isClass(type) {
  // 类组件会有这个标识
  // 因为类其实也就是一个构造函数，所以函数都有 prototype 属性，只根据这一个区分不出来
  return Boolean(type.prototype) && Boolean(type.prototype.isReactComponent);
}

class CompositeComponent {
  constructor(element) {
    this.currentElement = element;
    this.renderedComponent = null;
    this.publicInstance = null;
  }

  getPublicInstance() {
    // 对于组合组件，公共类实例
    return this.publicInstance;
  }

  mount() {
    let element = this.currentElement;
    let type = element.type;
    let props = element.props;

    let publicInstance;
    let renderedElement;

    if (isClass(type)) {
      // 类组件
      publicInstance = new type(props);
      // 设置 props
      publicInstance.props = props;
      // 如果有生命周期方法就调用
      if (publicInstance.componentWillMount) {
        publicInstance.componentWillMount();
      }
      renderedElement = publicInstance.render();
    } else if (typeof type === 'function') {
      // 函数组件
      publicInstance = null;
      renderedElement = type(props);
    }

    // 保存公共实例
    this.publicInstance = publicInstance;

    // 递归，根据元素实例化子内部实例
    // <div /> 或 <p /> 是 DOMComponent，而 <App /> 或 <Button /> 是 CompositeComponent
    let renderedComponent = initialComponent(renderedElement);
    this.renderedComponent = renderedComponent;

    // 挂载渲染后的输出
    return renderedComponent.mount();
  }

  unmount() {
    // 如果有生命周期方法就调用
    let publicInstance = this.publicInstance;
    
    if (publicInstance) {
      publicInstance.componentWillUnMount && publicInstance.componentWillUnMount();
    }

    // 递归卸载，卸载单个渲染的组件
    let renderedComponent = this.renderedComponent;

    renderedComponent.unmount();
  }

  getHostNode() {
    // 要求渲染组件提供它，递归深入任意组合组件
    return this.renderedComponent.getHostNode();
  }

  receive(nextElement) {
    let publicInstance = this.publicInstance;
    let prevRenderedComponent = this.renderedComponent;
    let prevRenderedElement = prevRenderedComponent.currentElement;

    // 更新*自己的*元素
    this.currentElement = nextElement;
    let type = nextElement.type;
    let nextProps = nextElement.props;

    // 找下一次 render() 输出的是什么
    let nextRenderedElement;
    if (isClass(type)) {
      // 类组件，如果有生命周期方法就调用
      publicInstance.componentWillUpdate && publicInstance.componentWillUpdate(nextProps);
      // 更新 props
      publicInstance.props = nextProps;
      // 重新渲染
      nextRenderedElement = publicInstance.render();
    } else if (typeof type === 'function') {
      // 函数组件
      nextRenderedElement = type(nextProps);
    }

    // 如果渲染元素的 type 没有更改，重用已经存在组件实例并退出
    if (prevRenderedElement.type === nextRenderedElement.type) {
      prevRenderedComponent.receive(nextRenderedElement);
      return ;
    }

    // 如果 type 不匹配，说明需要卸载之前挂载的组件，重新挂载新的组件，并交换其节点
    let prevNode = prevRenderedComponent.getHostNode();

    // 卸载旧的子组件并挂载新的子组件
    prevRenderedComponent.unmount();
    let nextRenderedComponent = initialComponent(nextRenderedElement);
    let nextNode = nextRenderedComponent.mount();

    // 替换子组件的引用
    this.renderedComponent = nextRenderedComponent;

    // 将旧节点替换为新节点
    // 注意，这是 renderer 特定的代码，理想情况下应位于 CompositeComponent 之外
    prevNode.parentNode.replaceChild(nextNode, prevNode);
  }
}

class DOMComponent {
  constructor(element) {
    this.currentElement = element;
    this.renderedChildren = [];
    this.node = null;
  }

  getPublicInstance() {
    // 对于 DOM 组件，只返回公共 DOM 节点
    return this.node;
  }

  mount() {
    let element = this.currentElement;
    let type = element.type;
    let props = element.props;
    let children = props.children || [];

    if (!Array.isArray(children)) {
      children = [children];
    }

    // 创建并保存节点
    let node = document.createElement(type);
    this.node = node;

    Object.keys(props).forEach(propName => {
      if (propName !== 'children') {
        node.setAttribute(propName, props[propName]);
      }
    });
  
    // 创建并保存包含的子项
    // 他们每一个都可以是 DOMComponent 或者 CompositeComponent，取决于类型是字符串还是函数
    let renderedChildren = children.map(initialComponent);
    this.renderedChildren = renderedChildren;

    // 收集他们在 mount 上返回的节点
    let childNodes = renderedChildren.map(child => {
      if (!child.mount) {
        // textNode 文本节点 "abc"
        return child;
      } else {
        return child.mount();
      }
    });

    childNodes.forEach(childNode => node.appendChild(childNode));

    // DOM 节点作为挂载结果返回
    return node;
  }

  unmount() {
    // 卸载所有的子项
    let renderedChildren = this.renderedChildren;
    renderedChildren.forEach(child => child.unmount && child.unmount());
  }

  getHostNode() {
    return this.node;
  }

  receive(nextElement) {
    let node = this.node;
    let prevElement = this.currentElement;
    let prevProps = prevElement.props;
    let nextProps = nextElement.props;

    this.currentElement = nextElement;
  
    // 删除旧的属性
    Object.keys(prevProps).forEach(propName => {
      if (propName !== 'children' && !nextProps.hasOwnProperty(propName)) {
        node.removeAttribute(propName);
      }
    });

    // 设置新的属性
    Object.keys(nextProps).forEach(propName => {
      if (propName !== 'children') {
        node.setAttribute(propName, nextProps[propName]);
      }
    });

    // 更新子组件
    // 这些是 React 元素的数组
    let prevChildren = prevProps.children || [];
    if (!Array.isArray(prevChildren)) {
      prevChildren = [prevChildren];
    }

    let nextChildren = nextProps.children || [];
    if (!Array.isArray(nextChildren)) {
      nextChildren = [nextChildren];
    }

    // 这些是内部实例的数组
    let prevRenderedChildren = this.renderedChildren;
    let nextRenderedChildren = [];

    // 当我们迭代子组件时，我们将向数组添加相应操作
    let operationQueue = [];

    // 注意以下部分非常简化
    // 它不处理重新排序、带空洞或有 key 的子组件
    // 它的存在只是为了说明整个流程，而不是细节
    for (let i = 0; i < nextChildren.length; i++) {
      // 尝试去获取此子组件现有的内部实例
      let prevChild = prevRenderedChildren[i];

      // 如果此索引下没有内部实例，则子实例已追加到末尾
      // 创建新的内部实例，挂载它，并使用其节点
      if (!prevChild) {
        let nextChild = initialComponent(nextChildren[i]);
        let node = nextChild.mount();

        // 记录我们要追加的节点
        operationQueue.push({type: 'ADD', node});
        nextRenderedChildren.push(nextChild);
        continue ;
      }

      // 仅当实例的元素类型匹配时，我们才能更新该实例
      // 例如，<Button size="small" /> 可以更新成 <Button size="large" />
      // 但是不能更新成 <App />
      let canUpdate = prevChildren[i].type === nextChildren[i].type;

      // 如果我们无法更新现有的实例，必须卸载它并安装一个新的实例去替代
      if (!canUpdate) {
        let prevNode = prevChild.getHostNode();
        prevChild.unmount();

        let nextChild = initialComponent(nextChildren[i]);
        let nextNode = nextChild.mount();

        // 记录我们要替换的节点
        operationQueue.push({type: 'REPLACE', prevNode, nextNode});
        nextRenderedChildren.push(nextChild);
        continue ;
      }

      // 如果我们能更新现有的内部实例，只是让它接受下一个元素并处理自己的更新
      prevChild.receive(nextChildren[i]);
      nextRenderedChildren.push(prevChild);
    }

    // 最后，卸载不存在的任何子组件
    for (let j = nextChildren.length; j < prevChildren.length; j++) {
      let prevChild = prevRenderedChildren[j];
      let node = prevChild.getHostNode();
      prevChild.unmount();

      // 记录我们要删除的节点
      operationQueue.push({type: 'REMOVE', node});
    }

    // 将渲染的子级列表指向更新的版本 
    this.renderedChildren = nextRenderedChildren;

    // 最后一步，执行 DOM 操作队列
    while (operationQueue.length > 0) {
      let operation = operationQueue.shift();
      switch (operation.type) {
        case 'ADD':
          this.node.appendChild(operation.node);
          break ;
        case 'REPLACE':
          this.node.replaceChild(operation.nextNode, operation.prevNode);
          break ;
        case 'REMOVE':
          this.node.removeChild(operation.node);
          break ;
      }
    }
  }
}

function initialComponent(element) {
  
  let type = element?.type;

  console.log(111)
  console.dir(element);

  if (typeof element === 'string') {
    // 文本节点 "abc"
    return document.createTextNode(element);
  } else if (typeof type === 'function') {
    // 用户自定义组件
    return new CompositeComponent(element);
  } else if (typeof type === 'string') {
    // 平台特定组件
    return new DOMComponent(element);
  }
}

export function mountTree(element, containerNode) {
  // debugger
  // 检查现有的树
  if (containerNode.firstChild) {
    let prevNode = containerNode.firstChild;
    let prevRootComponent = prevNode._internalInstance;
    let prevElement = prevRootComponent.currentElement;

    // 如果可以，重用现有的根组件
    if (prevElement.type === element.type) {
      prevRootComponent.receive(element);
      return ;
    }

    // 否则，卸载现有树
    unmountTree(containerNode);
  }

  // 创建顶层内部实例
  let rootComponent = initialComponent(element);

  // 挂载顶层组件到容器中
  let node = rootComponent.mount();
  containerNode.appendChild(node);

  // 保存对内部实例的引用
  node._internalInstance = rootComponent;

  console.log(1111)
  console.log(node)
  console.dir(node)

  // 返回它提供的公共实例
  let publicInstance = rootComponent.getPublicInstance();
  return publicInstance;
}

// 类似于 ReactDOM.unmountComponentAtNode()
export function unmountTree(containerNode) {
  // 从 DOM 节点读取内部实例
  let node = containerNode.firstChild;
  let rootComponent = node._internalInstance;

  // 卸载树并清空容器
  rootComponent.unmount();
  containerNode.innerHTML = '';
}

export default {
  Component,
  createElement
}