import React, {useState} from 'react';
import {useMenu} from "@assets/reducers/menuReducer";
export default function ToggleMenu() {
  const {isActiveMenu, setIsActiveMenu} = useMenu();

  return (
    <div className="toggle-menu" onClick={() => setIsActiveMenu(!isActiveMenu)}>
      <i className="fa-solid fa-bars" ></i>
    </div>
  );
}
