import React from './react.js';

const container = document.getElementById("root");

function Counter() {
  const [count, setCount] = React.useState(1);
  return (
    <h1 onClick={() => setCount(c => c+1)}>count: {count}</h1>
  )
}

const element = <Counter />

React.render(element, container);


