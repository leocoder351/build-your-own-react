import React, { mount } from './app.js';

class App extends React.Component {
  render() {
    return (
      <div>
        <p>build your own react</p>
        <Wrapper content="btn" />
      </div>
    )
  }
}

function Wrapper(props) {
  return (
    <div>
      <p>{props.content}</p>
      <span>hello</span>
    </div>
  )
}

console.log(mount)
console.log(mount(<App />))
let rootElem = document.getElementById('app');
rootElem.appendChild(mount(<App />));