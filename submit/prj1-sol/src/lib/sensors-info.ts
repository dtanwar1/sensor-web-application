import { Errors, Checkers } from 'cs544-js-utils';
import { validateFindCommand, SensorType, Sensor, SensorReading,
	 makeSensorType, makeSensor, makeSensorReading 
       } from './validators.js';

type FlatReq = Checkers.FlatReq; //dictionary mapping strings to strings

//marks T as having being run through validate()
type Checked<T> = Checkers.Checked<T>;
type Dict<T> = { [key: string]: T };

/*********************** Top Level Sensors Info ************************/

export class SensorsInfo {

  //TODO: define instance fields; good idea to keep private and
  //readonly when possible.
  private sensorType : Dict<SensorType>;
  private sensorReading : Dict<SensorReading[]>;
  private sensor : Dict<Sensor>;
  
  constructor() {
    this.sensorType = {};
    this.sensorReading = {};
    this.sensor = {};
    //TODO
  }

  /** Clear out all sensors info from this object.  Return empty array */
  clear() : Errors.Result<string[]> {
    //TODO
    return Errors.okResult([]);
  }

  /** Add sensor-type defined by req to this.  If there is already a
   *  sensor-type having the same id, then replace it. Return single
   *  element array containing the added sensor-type.
   *
   *  Error Codes:
   *     'REQUIRED': a required field is missing.
   *     'BAD_VAL': a bad value in a field (a numeric field is not numeric)
   *     'BAD_RANGE': an incorrect range with min >= max.
   */
  addSensorType(req: Record<string, string>) : Errors.Result<SensorType[]> {
    const sensorTypeResult = makeSensorType(req);
    if (!sensorTypeResult.isOk) return sensorTypeResult;
    const sensorType = sensorTypeResult.val;
    //TODO add into this
    this.sensorType[sensorType.id] = sensorType;
    return Errors.okResult([sensorType]);
  }
  
  /** Add sensor defined by req to this.  If there is already a 
   *  sensor having the same id, then replace it.  Return single element
   *  array containing the added sensor.
   *
   *  Error Codes:
   *     'REQUIRED': a required field is missing.
   *     'BAD_VAL': a bad value in a field (a numeric field is not numeric)
   *     'BAD_RANGE': an incorrect range with min >= max.
   *     'BAD_ID': unknown sensorTypeId.
   */
  addSensor(req: Record<string, string>): Errors.Result<Sensor[]> {
    //TODO
    const sensorResult = makeSensor(req);
    if(!sensorResult.isOk) return sensorResult;
    const sensor = sensorResult.val;
    this.sensor[sensor.id] = sensor;

    
    if(findKeyInDictionary(this.sensorType, sensor.sensorTypeId) === false){
      const msg = `unknown sensor type ${sensor.id}`;
      return Errors.errResult(msg,"BAD_ID");
    }else{
        if(sensor.expected.isSubrange(this.sensorType[sensor.sensorTypeId].limits) === false){
          const msg = `expected range inconsistent with sensor-type ${sensor.id}`;
          return Errors.errResult(msg,"BAD_RANGE");
        }
    }
    return Errors.okResult([sensor]);
  }

  /** Add sensor reading defined by req to this.  If there is already
   *  a reading for the same sensorId and timestamp, then replace it.
   *  Return single element array containing added sensor reading.
   *
   *  Error Codes:
   *     'REQUIRED': a required field is missing.
   *     'BAD_VAL': a bad value in a field (a numeric field is not numeric)
   *     'BAD_RANGE': an incorrect range with min >= max.
   *     'BAD_ID': unknown sensorId.
   */
  addSensorReading(req: Record<string, string>)
    : Errors.Result<SensorReading[]> 
  {
    //TODO
    const sensorReadingResult = makeSensorReading(req);
    if(!sensorReadingResult.isOk) return sensorReadingResult;
    const sensorReading = sensorReadingResult.val;
    if(findKeyInDictionary(this.sensor, sensorReading.sensorId) === false){
      const msg = `unknown sensor ${sensorReading.sensorId}`;
      return Errors.errResult(msg,"BAD_ID");
    }else{
        if(!this.sensorReading[sensorReading.sensorId]){
          this.sensorReading[sensorReading.sensorId] = [];
        }
        let index = this.sensorReading[sensorReading.sensorId].findIndex(x=> x.timestamp === sensorReading.timestamp);

        if(index>-1){
          this.sensorReading[sensorReading.sensorId][index].value = sensorReading.value;
        }else{
          this.sensorReading[sensorReading.sensorId].push(sensorReading);
        }
    }
    /////
    return Errors.okResult([...this.sensorReading[sensorReading.sensorId]]);
  }

  /** Find sensor-types which satify req. Returns [] if none. 
   *  Note that all primitive SensorType fields can be used to filter.
   *  The returned array must be sorted by sensor-type id.
   */
  findSensorTypes(req: FlatReq) : Errors.Result<SensorType[]> {
    const validResult: Errors.Result<Checked<FlatReq>> =
      validateFindCommand('findSensorTypes', req);
    if (!validResult.isOk) return validResult;
    if(Object.keys(validResult.val).length === 0){
      return Errors.okResult([...Object.values(this.sensorType)]);
    }
    let filteredSensorsTypes :SensorType[] = [];
    for(const [sensorId,sensorTypeObj] of Object.entries(this.sensorType)){
      let conditionMet : Boolean = false;
      for(const [entities, values]  of Object.entries(sensorTypeObj)){
        let breakLoop: Boolean = false;
        for(const [rqkey,rqvalue] of Object.entries(validResult.val)){
          if(entities === rqkey){
              if(rqvalue === values){
                conditionMet = true;
              }
              else{
                conditionMet = false;
                breakLoop = true;
                break;
              }
          }
        }
        if(breakLoop){
          break;
        }
     }
     if(conditionMet){
      filteredSensorsTypes.push(sensorTypeObj);
     }
     
    }    
    return Errors.okResult([...filteredSensorsTypes]);
  }
  
  /** Find sensors which satify req. Returns [] if none. 
   *  Note that all primitive Sensor fields can be used to filter.
   *  The returned array must be sorted by sensor id.
   */
  findSensors(req: FlatReq) : Errors.Result<Sensor[]> { 
    const validResult: Errors.Result<Checked<FlatReq>> =
      validateFindCommand('findSensors', req);
    if (!validResult.isOk) return validResult;
    if(Object.keys(validResult.val).length === 0){
      return Errors.okResult([...Object.values(this.sensor)]);
    }
    let filteredSensors :Sensor[] = [];
    for(const [sensorId,sensorObj] of Object.entries(this.sensor)){
      let conditionMet : Boolean = false;
      for(const [entities, values]  of Object.entries(sensorObj)){
        let breakLoop: Boolean = false;
        for(const [rqkey,rqvalue] of Object.entries(validResult.val)){
          if(entities === rqkey){
              if(rqvalue === values){
                conditionMet = true;
              }
              else{
                conditionMet = false;
                breakLoop = true;
                break;
              }
          }
        }
        if(breakLoop){
          break;
        }
     }
     if(conditionMet){
      filteredSensors.push(sensorObj);
     }
     
    }
    return Errors.okResult([...filteredSensors]);
  }
  
  /** Find sensor readings which satify req. Returns [] if none.  Note
   *  that req must contain sensorId to specify the sensor whose
   *  readings are being requested.  Additionally, it may use
   *  partially specified inclusive bounds [minTimestamp,
   *  maxTimestamp] and [minValue, maxValue] to filter the results.
   *
   *  The returned array must be sorted numerically by timestamp.
   */
  findSensorReadings(req: FlatReq) : Errors.Result<SensorReading[]> {
    const validResult: Errors.Result<Checked<FlatReq>> =
    validateFindCommand('findSensorReadings', req);
    if (!validResult.isOk) return validResult;
    let filteredSensorReadings :SensorReading[] = [];
    const sensorId = validResult.val["sensorId"];
    filteredSensorReadings = this.sensorReading[sensorId];
    for(const[key,value] of Object.entries(validResult.val)){
      if(key === "sensorId"){
        continue;
      }else if(key === "minValue"){
        filteredSensorReadings = filteredSensorReadings.filter((x) => x.value >= Number(value))
      }else if(key === "maxValue"){
        filteredSensorReadings = filteredSensorReadings.filter((x) => x.value <= Number(value))
      }else if(key === "minTimestamp"){
        filteredSensorReadings = filteredSensorReadings.filter((x) => x.timestamp >= Number(value))
      }else if(key === "maxTimestamp"){
        filteredSensorReadings = filteredSensorReadings.filter((x) => x.timestamp <= Number(value))
      }
    }
    return Errors.okResult([...filteredSensorReadings]);
  }
  
}

/*********************** SensorsInfo Factory Functions *****************/

export function makeSensorsInfo(sensorTypes: FlatReq[]=[],
				sensors: FlatReq[]=[],
				sensorReadings: FlatReq[]=[])
  : Errors.Result<SensorsInfo>
{
  const sensorsInfo = new SensorsInfo();
  const addResult =
    addSensorsInfo(sensorTypes, sensors, sensorReadings, sensorsInfo);
  return (addResult.isOk) ? Errors.okResult(sensorsInfo) : addResult;
}

export function addSensorsInfo(sensorTypes: FlatReq[], sensors: FlatReq[],
			       sensorReadings: FlatReq[],
			       sensorsInfo: SensorsInfo)
  : Errors.Result<void>
{
  for (const sensorType of sensorTypes) {
    const result = sensorsInfo.addSensorType(sensorType);
    if (!result.isOk) return result;
  }
  for (const sensor of sensors) {
    const result = sensorsInfo.addSensor(sensor);
    if (!result.isOk) return result;
  }
  for (const reading of sensorReadings) {
    const result = sensorsInfo.addSensorReading(reading);
    if (!result.isOk) return result;
  }
  return Errors.VOID_RESULT;
}



/****************************** Utilities ******************************/

//TODO add any utility functions or classes
export function findKeyInDictionary<T>(dictionary : Dict<T>, key : String) : boolean {

  for(const keys in dictionary){
    if(keys === key){
      return true;
    }
  }
  return false;
}

export function filterInList<T>(dictionary : Dict<T>, filteringParams : Checked<Checkers.FlatReq>) : Errors.Result<T[]> {
  
  for(const dicKey in dictionary){
    for(const filtkeys in filteringParams){
      if(dicKey === filtkeys){
        
      }
    }
  }

  return Errors.okResult([]);
}
