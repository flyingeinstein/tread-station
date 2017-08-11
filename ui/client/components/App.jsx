/*
    ./client/components/App.jsx
*/
import React from 'react';
import Dial from './dial/Dial.jsx';
import "app.css";
import "style.css";
import "red.css";
import "controls.css";
import "modal.css";
import "panels.css";
import "shapes.css";


export default class App extends React.Component {
  render() {
    return (
     <div style={{textAlign: 'center'}}>
         <Dial>testing</Dial>
     </div>);
  }
}
