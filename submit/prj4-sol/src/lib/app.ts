import { Errors } from 'cs544-js-utils';
import { PagedValues, makeSensorsWs, SensorsWs } from './sensors-ws.js';

import init from './init.js';
import { makeElement, getFormData } from './utils.js';
import { Err, OkResult, okResult } from 'cs544-js-utils/dist/lib/errors.js';

const ADD_SENSOR_TYPE = 'addSensorType';
const ADD_SENSOR = 'addSensor';
const FIND_SENSOR_TYPE = 'findSensorTypes';
const FIND_SENSOR = 'findSensors';


export default function makeApp(wsUrl: string) {
  const ws = makeSensorsWs(wsUrl);
  init();
  selectTab(ADD_SENSOR_TYPE);
  addSubmitListener(ADD_SENSOR_TYPE, ws);
  addSubmitListener(ADD_SENSOR, ws);
  findSubmitListener(FIND_SENSOR_TYPE, ws);
  findSubmitListener(FIND_SENSOR, ws);
  scrollClickListener(FIND_SENSOR_TYPE,ws);
  scrollClickListener(FIND_SENSOR,ws);
  

  
  //TODO: add call to select initial tab and calls to set up
  //form submit listeners
}


function scrollClickListener(rootId:string, ws :SensorsWs){
  const result = getScroll(rootId);
  let clonedScrolls: { [key: string]: HTMLElement } = {};
  for(const [key,value] of Object.entries(result)){
      clonedScrolls[key] = value.cloneNode(true) as HTMLElement;
  }
  
  for(const [key,value] of Object.entries(clonedScrolls)){
        value.addEventListener('click',async (event) => {
        const redirectLink =  value?.getAttribute('redirectLink');
        cleardisplayResult(rootId);
        if(redirectLink){
          const result = await resultFactory(event,{},rootId,ws, redirectLink);
          if(result && !result.isOk) displayErrors(rootId,result.errors);
          else if(result && result.isOk){
            const {values,next,prev} = result.val;
            displayResults(rootId,values);
            const {next0,next1,prev0,prev1} = clonedScrolls;
            displayScroll(next0,next);
            displayScroll(next1,next);
            displayScroll(prev0,prev);
            displayScroll(prev1,prev);

          }
        }
      });
    if(key === 'next0'){
      result.next0.replaceWith(value);
    }else if(key === 'next1'){
      result.next1.replaceWith(value);
    }else if(key === 'prev0'){
      result.prev0.replaceWith(value);
    }else if(key === 'prev1'){
      result.prev1.replaceWith(value);
    }
    
  }  
}






function addSubmitListener(rootId:string, ws :SensorsWs){
  const form = getForm(rootId);
  
  form.addEventListener('submit',async (event) => {
    const formData = getFormData(form);
    cleardisplayResult(rootId);
    const result = await resultFactory(event,formData,rootId,ws, '');
    if(result && !result.isOk) displayErrors(rootId,result.errors);
    else if(result && result.isOk){
      const {values,next,prev} = result.val;
      displayResults(rootId,values);
    }
  });
}

function findSubmitListener(rootId:string, ws :SensorsWs){
  const form = getForm(rootId);
  
  form.addEventListener('submit',async (event) => {
    const formData = getFormData(form);
    cleardisplayResult(rootId);
    clearScrolls(rootId);
    const result = await resultFactory(event,formData,rootId,ws, '');
    if(result && !result.isOk) displayErrors(rootId,result.errors);
    else if(result && result.isOk){
      const {values,next,prev} = result.val;
      displayResults(rootId,values);
      const{next0,next1,prev0,prev1} = getScroll(rootId);
      displayScroll(next0,next);
      displayScroll(next1,next);
      displayScroll(prev0,prev);
      displayScroll(prev1,prev);
    }
  });
}


function selectTab(rootId:string){
  const tabId = `#${rootId}-tab`;
  const tab = document.querySelector(tabId) as HTMLInputElement;
  tab.setAttribute('checked','checked');
}

/** clear out all errors within tab specified by rootId */
function clearErrors(rootId: string) {
  document.querySelectorAll(`.${rootId}-errors`).forEach( el => {
    el.innerHTML = '';
  });
}

function cleardisplayResult(rootId: string) {
  document.querySelectorAll(`#${rootId}-results`).forEach( el => {
    el.innerHTML = '';
  });
}

function clearScrolls(rootId: string) {
  const {next0,next1,prev0,prev1} = getScroll(rootId);
  setVisibility(next0,false);
  setVisibility(next1,false);
  setVisibility(prev0,false);
  setVisibility(prev1,false);
}

/** Display errors for rootId.  If an error has a widget widgetId such
 *  that an element having ID `${rootId}-${widgetId}-error` exists,
 *  then the error message is added to that element; otherwise the
 *  error message is added to the element having to the element having
 *  ID `${rootId}-errors` wrapped within an `<li>`.
 */  
function displayErrors(rootId: string, errors: Errors.Err[]) {
  for (const err of errors) {
    const id = err.options.widget;
    const widget = id && document.querySelector(`#${rootId}-${id}-error`);
    if (widget) {
      widget.append(err.message);
    }
    else {
      const li = makeElement('li', {class: 'error'}, err.message);
      document.querySelector(`#${rootId}-errors`)!.append(li);
    }
  }
}

function displayResults(rootId:string, result:Record<string, string>[]){
  const id = document.querySelector(`#${rootId}-results`) as HTMLElement;
  for(const entry of result){
    const dl = makeElement('dl',{class : 'result'});
    for(const [key,value] of Object.entries(entry)){
      const dt = makeElement('dt',{},key);
      dl.appendChild(dt);
      const dd = makeElement('dd',{},value);
      dl.appendChild(dd);
    }
    id?.appendChild(dl); 
  }  
}

function getScroll(rootId:string){
  const element = document.querySelector(`#${rootId}-results`) as HTMLElement;
  const scrollBefore = element?.previousSibling as HTMLElement; 
  const prev0 = scrollBefore.firstChild as HTMLElement;
  const next0 = scrollBefore.lastChild as HTMLElement;
  const scrollAfter = element?.nextSibling as HTMLElement;
  const prev1 = scrollAfter.firstChild as HTMLElement;
  const next1 = scrollAfter.lastChild as HTMLElement;
  return {prev0,next0,prev1,next1};
}

function displayScroll(element: HTMLElement,link?:string){

  if(link){
    setVisibility(element,true);
    element.setAttribute('redirectLink', link);
    
  }else{
    setVisibility(element,false);
  }
  

}

/** Turn visibility of element on/off based on isVisible.  This
 *  is done by adding class "show" or "hide".  It presupposes
 *  that "show" and "hide" are set up with appropriate CSS styles.
 */
function setVisibility(element: HTMLElement, isVisible: boolean) {
  element.classList.add(isVisible ? 'show' : 'hide');
  element.classList.remove(isVisible ? 'hide' : 'show');
}

function getForm(rootId:string) : HTMLFormElement{
  const formId = `#${rootId}-form`;
  const form = document.querySelector(formId) as HTMLFormElement;
  return form;
}

async function resultFactory(event :Event|SubmitEvent,
  formData: Record<string,string>,
  rootId:string, ws:SensorsWs,
  relink? : string){
  let result;
  event.preventDefault();
  clearErrors(rootId);
  if(event instanceof SubmitEvent){
    if(rootId === FIND_SENSOR){
      result =await ws.findSensorsByReq (formData)
    }else if(rootId === FIND_SENSOR_TYPE){
      result =await ws.findSensorTypesByReq(formData);
    }else if(rootId === ADD_SENSOR_TYPE){
      result = await ws.addSensorType (formData);
      if(result.isOk){
        const values = [result.val];
        const next = undefined;
        const prev = undefined;
        const val = {values,next,prev};
        result = Errors.okResult(val);
      }
    }else if(rootId === ADD_SENSOR){
      result = await ws.addSensor(formData);
      if(result.isOk){
        const values = [result.val];
        const next = undefined;
        const prev = undefined;
        result = Errors.okResult({values,next,prev});
      }
    }
  }else if(event instanceof Event && relink){

    if(rootId === FIND_SENSOR){
      result = await ws.findSensorsByRelLink (relink);
    }else if(rootId === FIND_SENSOR_TYPE){
      result = await ws.findSensorTypesByRelLink(relink);
    }
  }
  if(result?.isOk){
    return Errors.okResult(result.val);
  }else if(!result?.isOk){
    return new Errors.ErrResult(result?.errors)
  }
  return result;
}




