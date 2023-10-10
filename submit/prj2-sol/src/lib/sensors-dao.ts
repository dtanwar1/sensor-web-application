import { SensorType, Sensor, SensorReading,
	 SensorTypeSearch, SensorSearch, SensorReadingSearch,
       } from './validators.js';

import { Errors, } from 'cs544-js-utils';

import * as mongo from 'mongodb';

/** All that this DAO should do is maintain a persistent data for sensors.
 *
 *  Most routines return an errResult with code set to 'DB' if
 *  a database error occurs.
 */

/** return a DAO for sensors at URL mongodbUrl */
export async function
makeSensorsDao(mongodbUrl: string) : Promise<Errors.Result<SensorsDao>> {
  return SensorsDao.make(mongodbUrl);
}

//the types stored within collections
type DbSensorType = SensorType & { _id: string };
type DbSensor = Sensor & { _id: string };
type DbSensorReading = SensorReading & { _id: {[key:string]:string|number} };

//options for new MongoClient()
const MONGO_OPTIONS = {
  ignoreUndefined: true,  //ignore undefined fields in queries
};

export class SensorsDao {

  
  private constructor(private readonly client: mongo.MongoClient,
    private readonly sensorType: mongo.Collection<DbSensorType>,
    private readonly sensorReading: mongo.Collection<DbSensorReading>,
    private readonly sensor: mongo.Collection<DbSensor>) {
    //TODO
  }

  /** factory method
   *  Error Codes: 
   *    DB: a database error was encountered.
   */
  static async make(dbUrl: string) : Promise<Errors.Result<SensorsDao>> {
    //takes care of all async ops, then call constructor
    const client =
    await (new mongo.MongoClient(dbUrl, MONGO_OPTIONS)).connect();
        const db = client.db();
        const sensorType = db.collection<DbSensorType>('sensorType');
        const sensor = db.collection<DbSensor>('sensor');
        const sensorReading = db.collection<DbSensorReading>('sensorReading');
        await sensorType.createIndex('id');
        await sensor.createIndex('sensorTypeId');
        await sensorReading.createIndex({'sensorId' :1,'timestamp':1 },{ unique: true });
        return Errors.okResult(new SensorsDao(client, sensorType,sensorReading,sensor));
  }

  /** Release all resources held by this dao.
   *  Specifically, close any database connections.
   *  Error Codes: 
   *    DB: a database error was encountered.
   */
  async close() : Promise<Errors.Result<void>> {
    try {
      await this.client.close();
      return Errors.VOID_RESULT;
    }
    catch (error) {
      return Errors.errResult(error.message, 'DB');
    }
  }

  /** Clear out all sensor info in this database
   *  Error Codes: 
   *    DB: a database error was encountered.
   */
  async clear() : Promise<Errors.Result<void>> {
    try {
      await this.sensorType.deleteMany({});
      await this.sensor.deleteMany({});
      await this.sensorReading.deleteMany({});
      return Errors.VOID_RESULT;
    }
    catch (e) {
      return Errors.errResult(e.message, 'DB');
    }
  }


  /** Add sensorType to this database.
   *  Error Codes: 
   *    EXISTS: sensorType with specific id already exists in DB.
   *    DB: a database error was encountered.
   */
  async addSensorType(sensorType: SensorType)
    : Promise<Errors.Result<SensorType>>
  {
    const sensorTypeObj = {...sensorType, _id: sensorType.id};
    
    try {
      const sensorTypeCollection = this.sensorType;
      await sensorTypeCollection.insertOne(sensorTypeObj);
    } catch (error) {
      if(error.code === MONGO_DUPLICATE_CODE){
        return Errors.errResult(error.message, 'EXISTS');
      }else{
        return Errors.errResult(error.message, 'DB');
      }
    }
    return Errors.okResult(sensorType);
  }

  /** Add sensor to this database.
   *  Error Codes: 
   *    EXISTS: sensor with specific id already exists in DB.
   *    DB: a database error was encountered.
   */
  async addSensor(sensor: Sensor) : Promise<Errors.Result<Sensor>> {
    const sensorObj = {...sensor, _id: sensor.id};
    const sensorCollection = this.sensor;
    try {
      await sensorCollection.insertOne(sensorObj);  
    } catch (error) {
      if(error.code === MONGO_DUPLICATE_CODE){
        return Errors.errResult(error.message, 'EXISTS');
      }else{
        return Errors.errResult(error.message, 'DB');
      }
    }
    return Errors.okResult(sensor);
  }

  /** Add sensorReading to this database.
   *  Error Codes: 
   *    EXISTS: reading for same sensorId and timestamp already in DB.
   *    DB: a database error was encountered.
   */
  async addSensorReading(sensorReading: SensorReading)
    : Promise<Errors.Result<SensorReading>> 
  {
    const sensorReadingObj = {...sensorReading, _id: {'sensorId':sensorReading.sensorId,'timestamp' :sensorReading.timestamp}};
    const sensorReadingCollection = this.sensorReading;
    try {
      await sensorReadingCollection.insertOne(sensorReadingObj);  
    } catch (error) {
      if(error.code === MONGO_DUPLICATE_CODE){
        return Errors.errResult(error.message, 'EXISTS');
      }else{
        return Errors.errResult(error.message, 'DB');
      }
    }
    
    return Errors.okResult(sensorReading);
  }

  /** Find sensor-types which satify search. Returns [] if none. 
   *  Note that all primitive SensorType fields can be used to filter.
   *  The returned array must be sorted by sensor-type id.
   *  Error Codes: 
   *    DB: a database error was encountered.
   */
  async findSensorTypes(search: SensorTypeSearch)
    : Promise<Errors.Result<SensorType[]>> 
  {
    const query: { [key: string]: string } = {};
    for (const [k, v] of Object.entries(search)) {
	      if (v !== undefined) query[k] = v;
    }
    if(query.id)query._id = query.id;
    try{
      const sensorTypeCollection = this.sensorType;
      const projection = { _id: false };
      const cursor = await sensorTypeCollection.find(query, {projection});
      const entries = await cursor.sort({id: 1}).toArray();
      return Errors.okResult(entries);

    }catch(error){
      return Errors.errResult(error.message, 'DB');
    }
    
  }
  
  /** Find sensors which satify search. Returns [] if none. 
   *  Note that all primitive Sensor fields can be used to filter.
   *  The returned array must be sorted by sensor-type id.
   *  Error Codes: 
   *    DB: a database error was encountered.
   */
  async findSensors(search: SensorSearch) : Promise<Errors.Result<Sensor[]>> {
    const query: { [key: string]: string } = {};
    for (const [k, v] of Object.entries(search)) {
	      if (v !== undefined) query[k] = v;
    }
    if(query.id)query._id = query.id;
    try{
      const sensorCollection = this.sensor;
      const projection = { _id: false };
      const cursor = await sensorCollection.find(query, {projection});
      const entries = await cursor.sort({sensorTypeId: 1}).toArray();
      return Errors.okResult(entries);

    }catch(error){
      return Errors.errResult(error.message, 'DB');
    }
  }

  /** Find sensor readings which satisfy search. Returns [] if none. 
   *  The returned array must be sorted by timestamp.
   *  Error Codes: 
   *    DB: a database error was encountered.
   */
  async findSensorReadings(search: SensorReadingSearch)
    : Promise<Errors.Result<SensorReading[]>> 
  {
    type SearchParam = { [key: string]: ({$eq : string |number}|{$gte : string |number}|{$lte : string |number} )};
    let searchQuery : SearchParam[] = [];
    for (const [k, v] of Object.entries(search)) {
      if (v !== undefined && v !==Infinity && v!== -Infinity ){
        let query:SearchParam = {};
        if(k === 'sensorId') query[k] = {$eq : v};
        else if(k === 'minValue') query['value'] = {$gte : v};
        else if(k === 'maxValue') query['value'] = {$lte: v};
        else if(k === 'minTimestamp') query['timestamp'] = {$gte : v};
        else if(k === 'maxTimestamp') query['timestamp'] = {$lte : v};
        searchQuery.push(query);
      }
    }
    
    const findQuery = searchQuery.length >1 ? {$and :searchQuery} : searchQuery[0];
    try{
      const sensorReadingCollection = this.sensorReading;
      const projection = { _id: false };
      const cursor = await sensorReadingCollection.find(findQuery, {projection});
      const entries = await cursor.sort({timestamp: 1}).toArray();
      return Errors.okResult(entries);

    }catch(error){
      return Errors.errResult(error.message, 'DB');
    }

  }
  
} //SensorsDao

//mongo err.code on inserting duplicate entry
const MONGO_DUPLICATE_CODE = 11000;

