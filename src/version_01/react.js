function isClass(type) {
  // 类的静态属性，继承自 Component 的类组件会有
  return Boolean(type?.isReactComponent);
}

class Component {
  // 类静态属性
  static isReactComponent = true;
}

// 根据 JSX 生成 VDOM 对象
function createElement (type, config, ...children) {
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
};

// render 实现
function render (element, containerNode) {
  // 多次调用 render() 方法触发更新
  if (containerNode.firstChild) {
    // 已经有元素了，则为更新过程
    let prevNode = containerNode.firstChild;
    let prevRootComponentInstance = prevNode._internalInstance;
    let prevElement = prevRootComponentInstance.currentElement;

    // 判断是否可重用根组件
    if (prevElement.type === element.type) {
      // 可重用，则调用 reveive 更新
      prevRootComponentInstance.receive(element);
      return ;
    }

    // 不可重用，则卸载整棵树重新渲染
    React.unmountComponentAtNode(containerNode);
  }

  // 这里 element 就是根组件的 VDOM 对象
  // 通过 initialComponent(element) 生成组件实例，可以保存状态
  let rootComponentInstance = initialComponent(element);
  // 调用 mount 会进行递归，直到将 React 组件变成 DOM 节点，也有可能直接是一个文本节点，则不用 mount
  // 这里返回的 node 就已经是一个 DOM 节点了
  let node = typeof rootComponentInstance === 'object' ? rootComponentInstance.mount() : rootComponentInstance;

  // 保存对根组件实例的引用
  node._internalInstance = rootComponentInstance;
  containerNode.appendChild(node);
};

function unmountComponentAtNode (containerNode) {
  // 从 DOM 节点读取内部实例
  let node = containerNode.firstChild;
  // 要找到这个 DOM node 根节点所对应的组件实例
  let rootrenderedComponentInstance = node._internalInstance;

  // 卸载树并清空容器
  rootrenderedComponentInstance.unmount();
  containerNode.innerHTML = '';
};

// 递归将 React 组件最终生成 DOM 节点
function initialComponent(element) {
  let type = element?.type;

  if (typeof element === 'string') {
    // 文本节点
    return document.createTextNode(element);
  } else if (typeof type === 'function') {
    // 用户自定义的 React 组件：类组件或者函数组件
    return new CompositeComponent(element);
  } else if (typeof type === 'string') {
    // DOM 原生标签
    return new DOMComponent(element);
  }
}

// 类组件或者函数组件
class CompositeComponent {
  constructor(element) {
    this.currentElement = element;
    this.componentInstance = null;
    this.renderedComponentInstance = null;
  }

  mount() {
    const { type, props } = this.currentElement;

    let componentInstance;
    let renderedElement;

    if (isClass(type)) {
      // 类组件
      componentInstance = new type(props);
      // 设置 props
      componentInstance.props = props;
      // 存在该生命周期则执行
      componentInstance?.componentWillMount();
      renderedElement = componentInstance.render();
    } else {
      // 函数组件
      componentInstance = null;
      renderedElement = type(props);
    }

    // 保存该组件实例
    this.componentInstance = componentInstance;

    // 这里 renderedElement 又是一个 VDOM 的 Element 对象
    // 依次进行递归编译得到下一个组件实例 renderedComponentInstance
    // 所以 renderedComponentInstance 保存的是当前组件实例 render() 的结果，是下一个要 mount 的 VDOM element
    let renderedComponentInstance = initialComponent(renderedElement);
    this.renderedComponentInstance = renderedComponentInstance;

    // 这里调用 mount() 开始引发递归
    // 如果类组件 render() 或者函数组件的 return 返回的一直都是 React 自定义组件的话，这个递归不会停止
    // 直到遇到了 DOM 原生标签，比如 'div'
    return renderedComponentInstance.mount();
  }

  unmount() {
    let componentInstance = this.componentInstance;

    // 有生命周期则调用
    componentInstance?.componentWillUnmount();
    // 递归卸载
    let renderedComponentInstance = this.renderedComponentInstance;
    renderedComponentInstance.unmount();
  }

  receive(nextElement) {
    let componentInstance = this.componentInstance;
    let prevRenderedComponentInstance = this.renderedComponentInstance;
    let prevRenderedElement = this.renderedComponentInstance.currentElement;

    // 更新自己的属性
    this.currentElement = nextElement;
    let type = nextElement.type;
    let nextProps = nextElement.props;

    // 找下一次 render 输出的是什么
    let nextRenderedElement;
    if (isClass(type)) {
      // 类组件，如果有生命周期则调用
      componentInstance.componentWillUpdate && componentInstance.componentWillUpdate();
      // 更新 props
      componentInstance.props = nextProps;
      // 重新渲染
      nextRenderedElement = componentInstance.render();
    } else if (typeof type === 'function') {
      // 函数组件
      nextRenderedElement = type(nextProps);
    }

    // 如果 render 出来元素的 type 没有更高，重用已经存在的组件实例并退出
    if (prevRenderedElement.type === nextRenderedElement.type) {
      prevRenderedComponentInstance.receive(nextRenderedElement);
      return ;
    }

    // 如果 type 不一样，则从它以后包括所有的子级元素全部不复用，重新渲染
    // 需要卸载之前挂载的组件，重新挂载新的组件，并交换其节点
    // 是要递归找到该组件渲染出来的第一个原生 DOM 元素
    let prevNode = prevRenderedComponentInstance.getHostNode();

    // 卸载旧的组子件并挂载新的子组件
    prevRenderedComponentInstance.unmount();
    let nextRenderedComponentInstance = initialComponent(nextRenderedElement);
    let nextNode = nextRenderedComponentInstance.mount();

    // 替换子组件的引用
    this.renderedComponentInstance = nextRenderedComponentInstance;

    // 将旧节点替换为新节点
    prevNode.parentNode.replaceChild(nextNode, prevNode);
  }

  getHostNode() {
    // 要求渲染组件提供它，递归深入任意组合组件
    return this.renderedComponentInstance.getHostNode();
  }
}

// DOM 原生标签
class DOMComponent {
  constructor(element) {
    this.currentElement = element;
    this.renderedChildrenComponentInstance = [];
    this.node = null;
  }

  mount() {
    let { type, props } = this.currentElement;
    let children = props.children || [];
    let node = document.createElement(type);
    this.node = node;

    if (!Array.isArray(children)) {
      // 只有一个子元素
      children = [children];
    }

    Object.keys(props).forEach(propName => {
      if (propName !== 'children') {
        node.setAttribute(propName, props[propName]);
      }
    });

    // 处理 children，对每一个 children 都要执行 initialComponent 生成组件实例
    let renderedChildrenComponentInstance = children.map(initialComponent);
    this.renderedChildrenComponentInstance = renderedChildrenComponentInstance;

    // 收集每个 children 递归后最终返回的 DOM 节点
    let childNodes = renderedChildrenComponentInstance.map(child => {
      if (!child?.mount) {
        // textnode 文本节点
        return child;
      } else {
        return child.mount();
      }
    });

    // 依次将子 DOM 节点挂载到父 DOM 节点上
    childNodes.forEach(childNode => node.appendChild(childNode));

    return node;
  }

  unmount() {
    // 不需要管父级 DOM 节点，因为最外层会把根 DOM 的 innerHTML = ''，所有 DOM 都会删除
    // 这里只需要把所有子级元素调用 unmount
    let renderedChildrenComponentInstance = this.renderedChildrenComponentInstance;
    renderedChildrenComponentInstance.forEach(child => child.unmount && child.unmount);
  }

  receive(nextElement) {
    let node = this.node;
    let prevElement = this.currentElement;
    let prevProps = prevElement.props;
    let nextProps = nextElement.props;

    this.currentElement = nextElement;

    // 1. 移除不存在的 node 属性
    Object.keys(prevProps).forEach(propName => {
      if (propName !== 'children' && !nextProps.hasOwnProperty(propName)) {
        node.removeAttribute(propName);
      }
    });

    // 2. 设置新的属性
    Object.keys(nextProps).forEach(propName => {
      if (propName !== 'children') {
        node.setAttribute(propName, nextProps[propName]);
      }
    });

    // 3. 更新子组件
    let prevChildren = prevProps.children || [];
    if (!Array.isArray(prevChildren)) {
      prevChildren = [prevChildren];
    }

    let nextChildren = nextProps.children || [];
    if (!Array.isArray(nextChildren)) {
      nextChildren = [nextChildren];
    }

    // 组件实例的数组
    let prevRenderedChildrenComponentInstance = this.renderedChildrenComponentInstance;
    let nextRenderedChildrenComponentInstance = [];

    // 当迭代子组件时，向队列添加相应的操作
    // 我理解，将 DOM 操作集中起来，批量处理，可以防止多次重排重绘
    let operationQueue = [];

    for (let i = 0; i < nextChildren.length; i++) {
      // 尝试去获取此子组件现有的实例
      let prevChildInstance = prevRenderedChildrenComponentInstance[i];

      // 如果此索引下没有实例，则子实例已追加到末尾
      // 创建新的内部实例，挂载它并使用其节点
      if (!prevChildInstance) {
        let nextChildInstance = initialComponent(nextChildren[i]);
        let node;
        console.log(999)
        console.log(nextChildInstance)
        if (nextChildInstance.mount) {
          node = nextChildInstance.mount();
        } else {
          // 文本节点
          node = nextChildInstance;
        }

        // 记录要追加的节点
        operationQueue.push({type: 'ADD', node});
        nextRenderedChildrenComponentInstance.push(nextChildInstance);
        continue ;
      }

      // 仅当实例的元素类型匹配时，我们才能更新该实例
      // 例如，<Button size="small" /> 可以更新成 <Button size="large" />
      // 但是不能更新成 <App />
      // debugger
      let canUpdate = prevChildren[i].type === nextChildren[i].type;

      // 如果无法更新现有的实例，必须卸载它并安装一个新的实例去替代，text 文本节点因为没有 type 也会走到这里 canUpdate 为 false
      if (!canUpdate) {
        let prevNode = prevChildInstance.getHostNode();
        // 卸载实例
        prevChildInstance.unmount();

        let nextChildInstance = initialComponent(nextChildren[i]);
        let nextNode = nextChildInstance.mount();

        // 记录要替换的节点
        operationQueue.push({type: 'REPLACE', prevNode, nextNode});
        nextRenderedChildrenComponentInstance.push(nextChildInstance);
        continue ;
      }

      // 如果可以更新现有的实例，只要让它接收下一个 element 并处理自己的更新
      if (prevChildInstance.receive) {
        // 组件实例
        prevChildInstance.receive(nextChildren[i]);
      } else {
        // text 文本节点直接修改值
        if (prevChildren[i] !== nextChildren[i]) {
          // 文本值不一样才修改
          prevChildInstance.nodeValue = nextChildren[i];
        }
      }

      nextRenderedChildrenComponentInstance.push(prevChildInstance);
    }

    // 最后，卸载不存在的任何子组件
    for (let j = nextChildren.length; j < prevChildren.length; j++) {
      let prevChildInstance = prevRenderedChildrenComponentInstance[j];
      let node = prevChildInstance.getHostNode();
      // 卸载组件实例
      prevChildInstance.unmount();
      // 记录要删除的 DOM 节点
      operationQueue.push({type: 'REMOVE', node});
    }

    // 将渲染的子级列表指向更新后的版本
    this.renderedChildrenComponentInstance = nextRenderedChildrenComponentInstance;

    // 最后一步，批量更新 DOM
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

  getHostNode() {
    return this.node;
  }
}

// 导出库
export const React = {
  Component,
  createElement,
  unmountComponentAtNode
};

export const ReactDOM = {
  render
};
