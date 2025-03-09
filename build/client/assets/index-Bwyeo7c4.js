import{r as i,c as x,S as L}from"./index-CgAaYQMV.js";var b={exports:{}},v={};/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var _;function S(){if(_)return v;_=1;var n=L,r=Symbol.for("react.element"),o=Symbol.for("react.fragment"),u=Object.prototype.hasOwnProperty,p=n.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,a={key:!0,ref:!0,__self:!0,__source:!0};function e(d,t,h){var f,l={},s=null,c=null;h!==void 0&&(s=""+h),t.key!==void 0&&(s=""+t.key),t.ref!==void 0&&(c=t.ref);for(f in t)u.call(t,f)&&!a.hasOwnProperty(f)&&(l[f]=t[f]);if(d&&d.defaultProps)for(f in t=d.defaultProps,t)l[f]===void 0&&(l[f]=t[f]);return{$$typeof:r,type:d,key:s,ref:c,props:l,_owner:p.current}}return v.Fragment=o,v.jsx=e,v.jsxs=e,v}b.exports=S();var y=b.exports;const g=i.forwardRef(function({open:n,onShow:r,onHide:o,children:u,...p},a){const[e,d]=i.useState(),{titleBar:t,saveBar:h,modalContent:f}=i.Children.toArray(u).reduce((s,c)=>{const m=O(c),w=m==="ui-title-bar",E=m==="ui-save-bar";return!w&&!E&&s.modalContent.push(c),{...s,titleBar:w?c:s.titleBar,saveBar:E?c:s.saveBar}},{modalContent:[]}),l=e&&e.content?x.createPortal(f,e.content):null;return i.useEffect(()=>{e&&(n?e.show():e.hide())},[e,n]),i.useEffect(()=>{if(!(!e||!r))return e.addEventListener("show",r),()=>{e.removeEventListener("show",r)}},[e,r]),i.useEffect(()=>{if(!(!e||!o))return e.addEventListener("hide",o),()=>{e.removeEventListener("hide",o)}},[e,o]),i.useEffect(()=>{if(e)return()=>{e.hide()}},[e]),y.jsxs("ui-modal",{...p,ref:s=>{d(s),a&&(typeof a=="function"?a(s):a.current=s)},children:[t,h,y.jsx("div",{children:l})]})});g.displayName="ui-modal";function O(n){if(!n)return;const r=typeof n=="object"&&"type"in n?n.type:void 0,o=typeof r=="string"?r:void 0,u=typeof r=="object"?r.displayName:void 0;return o||(typeof u=="string"?u:void 0)}const C="ui-nav-menu",T="ui-title-bar",j=i.forwardRef(function({open:n,onShow:r,onHide:o,children:u,...p},a){const[e,d]=i.useState();return i.useEffect(()=>{e&&(n?e.show():e.hide())},[e,n]),i.useEffect(()=>{if(!(!e||!r))return e.addEventListener("show",r),()=>{e.removeEventListener("show",r)}},[e,r]),i.useEffect(()=>{if(!(!e||!o))return e.addEventListener("hide",o),()=>{e.removeEventListener("hide",o)}},[e,o]),i.useEffect(()=>{if(e)return()=>{e.hide()}},[e]),y.jsx("ui-save-bar",{...p,ref:t=>{d(t),a&&(typeof a=="function"?a(t):a.current=t)},children:u})});j.displayName="ui-save-bar";const B=new Proxy({},{get(n,r){throw Error(`shopify.${String(r)} can't be used in a server environment. You likely need to move this code into an Effect.`)}});function N(){if(typeof window>"u")return B;if(!window.shopify)throw Error("The shopify global is not defined. This likely means the App Bridge script tag was not added correctly to this page");return window.shopify}export{N as R,T as _,C as b};
