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
    this.renderedCompoenent = null;
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
    this.renderedCompoenent = renderedComponent;

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
    let renderedComponent = this.renderedCompoenent;

    renderedComponent.unmount();
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
}

function initialComponent(element) {
  console.log('element', element);
  let type = element.type;

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
  // 销毁所有现有的树，重复运行 mountTree 的时候，会删除旧树并在组件上运行 componentWillUnmount() 生命周期方法
  if (containerNode.firstChild) {
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