const express = require('express');
const app = express();

const {Datastore} = require('@google-cloud/datastore');
const bodyParser = require('body-parser');

// const projectId = 'boats-hw3-cs493-rotenberg';
const datastore = new Datastore();

const BOAT = "Boat";
const SLIP = "Slip";

const router = express.Router();

app.use(bodyParser.json());

function fromDatastore(item){
    item.id = item[Datastore.KEY].id;
    return item;
}

/* ------------- Begin Lodging Model Functions ------------- */
// creates a new boat
function post_boat(name, type, length){
  var key = datastore.key(BOAT);
	const new_boat = {"name": name, "type": type, "length": length};
	return datastore.save({"key":key, "data":new_boat}).then(() => {return key});
}

// get all boats
function get_boats(){
	const q = datastore.createQuery(BOAT);
	return datastore.runQuery(q).then( (entities) => {
			return entities[0].map(fromDatastore);
		});
}

// get one boat
function get_boat(boat_id){
  const key = datastore.key([BOAT, parseInt(boat_id)]);
  return datastore.get(key).then( (entity) => {
    // console.log('Entity ', entity);
      if (entity[0] === undefined) {
        return '';
      }
      return entity.map(fromDatastore)[0];
  });
}

function patch_boat(boatid, payload) {
  return get_boat(boatid)
  .then((boat) => {
    // console.log('boat in patch', boat);
    if (boat) {
      const entity = {
        key: datastore.key([BOAT, parseInt(boatid)]),
        data: payload
      }; 
      
      return datastore.update(entity).then( (entity) => {
          return get_boat(boatid);
      });
    }
  
    return '';
  });
}

// // TODO
// function put_lodging(id, name, description, price){
//     const key = datastore.key([LODGING, parseInt(id,10)]);
//     const lodging = {"name": name, "description": description, "price": price};
//     return datastore.save({"key":key, "data":lodging});
// }

// // TODO
// function delete_lodging(id){
//     const key = datastore.key([LODGING, parseInt(id,10)]);
//     return datastore.delete(key);
// }

/* ------------- End Model Functions ------------- */

/* ------------- Begin Controller Functions ------------- */

router.get('/', (req, res) => {
  res.send('Hello from Daniel\'s Boats App!');
});

// GET to get all boats
router.get('/boats', function(req, res){
  const boats = get_boats()
	.then( (boats) => {
        res.status(200).json(boats);
    });
});

// GET to get specific boat
router.get('/boats/:boat_id', function(req, res){
  const reqUrl = req.url;
  const specificBoat = req.params.boat_id; // gets the id of the boat
  const boat = get_boat(specificBoat)
  .then( (boat) => {
    if (boat) {
      boat.self = req.protocol + '://' + req.get('host') + req.url;
      return res.status(200).json(boat);
    }
    return res.status(404).json({"Error": "No boat with this boat_id exists"});

  })
});

// POST to create a boat
router.post('/boats', function(req, res){
    const fullUrl = req.protocol + '://' + req.get('host') + req.url + '/';
    if (!req.body.name || !req.body.type || !req.body.length) {
      res.status(400).json({ 
        "Error":  "The request object is missing at least one of the required attributes" 
      }); 
      return;
    }
    post_boat(req.body.name, req.body.type, req.body.length)
    .then( key => {console.log("Key: ", key);
      res.status(201).json({ 
        "id":  key.id, 
        "name": req.body.name, 
        "type": req.body.type,
        "length": req.body.length,
        "self": fullUrl + key.id
      })} 
    );
});

router.patch('/boats/:boat_id', function(req, res){
  const fullUrl = req.protocol + '://' + req.get('host') + req.url + '/';
  const boatID = req.params.boat_id;
  console.log("BOATID", boatID);
  if (!req.body.name || !req.body.type || !req.body.length) {
    res.status(400).json({ 
      "Error":  "The request object is missing at least one of the required attributes" 
    }); 
    return;
  }

  patch_boat(boatID, req.body)
  .then( (boat) => {
    console.log('boat ', boat);
    if (boat) {
      console.log(boat);
      boat.self = req.protocol + '://' + req.get('host') + req.url;
      return res.status(200).json(boat);
    }
    return res.status(404).json({ 
      "Error":  "No boat with this boat_id exists"
    }); 
  });
});

// // TODO
// router.put('/:id', function(req, res){
//     put_lodging(req.params.id, req.body.name, req.body.description, req.body.price)
//     .then(res.status(200).end());
// });

// // TODO
// router.delete('/:id', function(req, res){
//     delete_lodging(req.params.id).then(res.status(200).end())
// });

/* ------------- End Controller Functions ------------- */

app.use('/', router);

// Listen to the App Engine-specified port, or 8080 otherwise
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});