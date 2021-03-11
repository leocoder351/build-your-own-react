// {
//   type: function App() {},
//   props: {}
// }

function isClass(type) {
  // 类组件会有这个标识
  // 因为类其实也就是一个构造函数，所以函数都有 prototype 属性，只根据这一个区分不出来
  return Boolean(type.prototype) && Boolean(type.prototype.isReactComponent);
}

// 这个函数接受一个 React 元素（例如 <App />）并返回表示已挂载树的 DOM 或者 原生节点
function mount(element) {
  let type = element.type;
  let props = element.props;

  // 如果是函数组件，直接调用 type(props)，函数返回值即是渲染后的元素，如果是类组件则调用 new type(props)，然后调用实例的 render() 返回渲染后的元素
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
  } else {
    // 函数组件
    renderedElement = type(props);
  }

  // 这个过程是递归的，因为组件可能会返回另一个组件类型的元素
  return mount(renderedElement);
}
