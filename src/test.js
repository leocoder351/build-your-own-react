let React = {};
let ReactDOM = {};

function isClass(type) {
  // 类的静态属性，继承自 Component 的类组件会有
  return Boolean(type?.isReactComponent);
}

class Component {
  // 类静态属性
  static isReactComponent = true;
}

/**
 * @description 根据 JSX 生成 VDOM 对象
 * @param type 元素类型，可以是类，函数，或者 DOM 原生标签
 * @param config 元素的 props
 * @param children 第 3 个及以后的参数均为 children 子元素
 * @return {object} 
 */
React.createElement = (type, config, ...children) => {
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
ReactDOM.render = (element, containerNode) => {
  // 这里 element 就是根组件的 VDOM 对象
  // 通过 initialComponent(element) 生成组件实例，可以保存状态
  let rootComponent = initialComponent(element);
  // 调用 mount 会进行递归，直到将 React 组件变成 DOM 节点，也有可能直接是一个文本节点，则不用 mount
  // 这里返回的 node 就已经是一个 DOM 节点了
  let node = typeof rootComponent === 'object' ? rootComponent.mount() : rootComponent;

  // 保存对根组件实例的引用
  node._internalInstance = rootComponent;
  
};

ReactDOM.unmountComponentAtNode = (containerNode) => {
  // 从 DOM 节点读取内部实例
  let node = containerNode.firstChild;
  // 要找到这个 DOM node 根节点所对应的组件实例
  let rootRenderedComponent = node._internalInstance;

  // 卸载树并清空容器
  rootRenderedComponent.unmount();
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
    this.publicInstance = null;
    this.renderedComponent = null;
  }

  mount() {
    const { type, props } = element;

    let publicInstance;
    let renderedElement;

    if (isClass(type)) {
      // 类组件
      publicInstance = new type(props);
      // 存在该生命周期则执行
      publicInstance?.componentWillMount();
      renderedElement = publicInstance.render();
    } else {
      // 函数组件
      publicInstance = null;
      renderedElement = type(props);
    }

    // 保存该组件实例
    this.publicInstance = publicInstance;

    // 这里 renderedElement 又是一个 VDOM 的 Element 对象
    // 依次进行递归编译得到下一个组件实例 renderedComponent
    // 所以 renderedComponent 保存的是当前组件实例 render() 的结果，是下一个要 mount 的 VDOM element
    let renderedComponent = initialComponent(renderedElement);
    this.renderedComponent = renderedComponent;

    // 这里调用 mount() 开始引发递归
    // 如果类组件 render() 或者函数组件的 return 返回的一直都是 React 自定义组件的话，这个递归不会停止
    // 直到遇到了 DOM 原生标签，比如 'div'
    return renderedComponent.mount();
  }

  unmount() {
    
  }
}

// DOM 原生标签
class DOMComponent {
  constructor(element) {
    this.currentElement = element;
  }

  mount() {
    let { type, props, children } = this.currentElement;
    let node = document.createElement(type);

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
    let renderedChildren = children.map(initialComponent);

    // 收集每个 children 递归后最终返回的 DOM 节点
    let childNodes = renderedChildren.map(child => {
      if (!child.mount) {
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
}