import { MongoClient } from "mongodb";
import express from "express";
import dotenv from "dotenv";
import cors from 'cors';
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
// import {auth} from './middleware/auth.js';

dotenv.config();

const app = express()
const PORT=process.env.PORT;

// const MONGO_URL = "mongodb://127.0.0.1";

const MONGO_URL= process.env.MONGO_URL;

async function createConnection() {
  const client = new MongoClient(MONGO_URL);
  await client.connect();
  console.log("Mongo is connected ✌😊");
  return client;
}

const client = await createConnection();

app.use(cors())
app.use(express.json());

app.get('/', function (request, response) {
  response.send("hello this a home page of all data")
});

app.get('/gmail_data', async function (request, response) {
  const movies = await client.db("gmail").collection("primary").find({}).toArray();
 response.send(movies)
});

app.get("/gmail_data/:name", async function (request, response) {
  const { name }=request.params;
  const result = await client.db("gmail").collection("primary").find({name:name}).toArray();
 response.send(result)
});

app.put("/gmail_data/:id", async function (request, response) {

  const { id }=request.params;
  console.log(request.params, id);
  const data= request.body;

  const result=await client
  .db("gmail")
  .collection("primary")
  .updateOne({ id : id },{$set:data});

  result.modifiedCount > 0
  ?response.send({msg:"movie successfully updated"})
  :response.status(400).send({msg:"movie not found"});
});

app.delete("/gmail_data/:name", async function (request, response) {
  const { name }=request.params;
  console.log(request.params, name);

  const result=await client
  .db("gmail")
  .collection("primary")
  .deleteOne({name : name });

  result.deletedCount > 0
  ?response.send({msg:"movie successfully deleted"})
  :response.status(401).send({msg:"movie not found"});
});

app.post('/gmail_data', async function (request, response) {
  const data = request.body;
  const result = await client.db("gmail").collection("primary").insertOne(data);
  response.send(result);
 });

//for sign up processs
app.get('/users/signup', async function (request, response) {
  const data = await client.db("gmail").collection("usersignup").find({}).toArray();
 response.send(data)
});

//signup processs
app.post('/users/signup', async function (request, response) {
  const {username, password} = request.body; 
  const userFromdb=await client
  .db("gmail")
  .collection("usersignup")
  .findOne({username:username});
  console.log(userFromdb);
  if(userFromdb){
    response.status(400).send({msg:'USER ALREADY EXISTS'})
  }
  else if(password.length<8){
    response.status(402).send({msg:"password must be longer"});
  }
  else{
    const hashedPassword=await genHashedPassword(password);
    console.log(password, hashedPassword);
    const result=await client.db("gmail").collection("usersignup").insertOne({username:username, password:hashedPassword});
    response.send(result);
  }
 });

 //login process
app.post('/users/login', async function (request, response) {
  const {username, password} = request.body; 
  const userFromdb=await client
  .db("gmail")
  .collection("usersignup")
  .findOne({username:username});
  console.log(userFromdb);

  if(!userFromdb){
    response.status(401).send({msg:'invalid credentials'});
  }else{
    const storePassword=userFromdb.password;
    const isPasswordMatch= await bcrypt.compare(password,storePassword);
    console.log(isPasswordMatch);
    
    if(isPasswordMatch){
      const token=jwt.sign({id:userFromdb._id},process.env.SECRET_KEY);
      response.send({msg:"login successful",token:token});
    }else{
      response.status(401).send({msg:"Invalid Credentials"});
    }
  }
 });

app.listen(PORT,()=>console.log(`APP is running ${PORT}`))

async function genHashedPassword(password){
  const NO_OF_ROUNDS=10;
  const salt = await bcrypt.genSalt(NO_OF_ROUNDS);
  const hashedPassword = await bcrypt.hash(password,salt);
  return hashedPassword
}

