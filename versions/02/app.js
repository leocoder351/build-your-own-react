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
  // 静态属性，相当于写在外面 Component.isReactComponent = true;
  static isReactComponent = true;
}

function isClass(type) {
  // 类组件会有这个标识
  // 因为类其实也就是一个构造函数，所以函数都有 prototype 属性，只根据这一个区分不出来
  return Boolean(type.prototype) && Boolean(type.isReactComponent);
}

// 此函数仅处理组合类型元素，例如 <App /> 或 <Button />，类组件函数组件都可以，但是不处理 <div />
function mountComposite(element) {
  let type = element.type;
  let props = element.props;
  let renderedElement;

  if (isClass(type)) {
    // 类组件
    let publicInstance = new type(props);
    // 设置 props，因为在类组件中可以通过 this.props 获取到 props 属性
    publicInstance.props = props;
    // 如果有生命周期方法就调用
    publicInstance.componentWillMount && publicInstance.componentWillMount();
    // 调用 render() 返回渲染后的元素
    renderedElement = publicInstance.render();
  } else if (typeof type === 'function') {
    // 函数组件
    renderedElement = type(props);
  }

  // 这个过程是递归的，但是当元素是宿主（例如：<div />）而不是组合（例如：<App />）时，达到递归终止条件
  return mount(renderedElement);
}

function mountHost(element) {
  let type = element.type;
  let props = element.props;
  let children = props.children || [];

  if (!Array.isArray(children)) {
    children = [children];
  }
  children = children.filter(Boolean);  // 为啥要拷贝一个出来没想明白

  // 这段代码不应该出现在 reconcier，不同的 renderer 可能会以不同方式初始化节点
  // 例如，ReactNative 会创建 iOS 或 Android 的视图
  let node = document.createElement(type);
  Object.keys(props).forEach(propName => {
    if (propName !== 'children') {
      node.setAttribute(propName, props[propName]);
    }
  });

  // 挂载子元素
  children.forEach(childElement => {
    // 子元素可能是宿主（例如：<div />）或者 组合（例如：<Button />）或者是文本元素 "abc"，所以依然递归挂载
    let childNode = null;

    if (typeof childElement === 'string') {
      // 文本元素 "abc"
      childNode = document.createTextNode(childElement);  
    } else {
      childNode = mount(childElement);
    }

    console.log('children.forEach.childElement', childElement)
    console.log('children.forEach.node', node)
    console.log('children.forEach.childNode', childNode)

    // 这一行代码也是特殊的 renderer，根据 renderer 不同，方式也不同
    node.appendChild(childNode);
  });

  // DOM 节点作为挂载的结果返回，这是递归结束的位置
  return node;
}

export function mount(element) {
  console.log('element', element);
  let type = element.type;

  if (typeof type === 'function') {
    // 用户自定义组件
    return mountComposite(element);
  } else if (typeof type === 'string') {
    // 平台特定组件
    return mountHost(element);
  }
}

export default {
  Component,
  createElement
}