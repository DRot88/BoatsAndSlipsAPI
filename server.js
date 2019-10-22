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

// updates boat
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

// Delete a Boat
function delete_boat(boat_id){
  const key = datastore.key([BOAT, parseInt(boat_id,10)]);
  return datastore.delete(key);
}

// Delete a Slip
function delete_slip(slip_id){
  const key = datastore.key([SLIP, parseInt(slip_id,10)]);
  return datastore.delete(key);
}


// creates a new slip
function post_slip(number, current_boat = null){
  var key = datastore.key(SLIP);
  const new_slip = {"number": number, "current_boat": current_boat};
  console.log("new slip: ", new_slip);
	return datastore.save({"key":key, "data":new_slip}).then(() => {return key});
}

// get all slips
function get_slips(){
	const q = datastore.createQuery(SLIP);
	return datastore.runQuery(q).then( (entities) => {
			return entities[0].map(fromDatastore);
		});
}

// get one slip
function get_slip(slip_id){
  const key = datastore.key([SLIP, parseInt(slip_id)]);
  return datastore.get(key).then( (entity) => {
    // console.log('Entity ', entity);
      if (entity[0] === undefined) {
        return '';
      }
      return entity.map(fromDatastore)[0];
  });
}

// adds a boat to a slip
function put_boat(slip_id, boat_id){
  const slip_key = datastore.key([SLIP, parseInt(slip_id,10)]);
  // console.log("slipKey: ", slip_key);
  return datastore.get(slip_key)
  .then( (slip) => {
      // console.log("slip[0]: ", slip[0]);
      if( slip[0].current_boat === null){
        // console.log("inside if");
        slip[0].current_boat = boat_id;
      } else if (slip[0].current_boat !== null) {
        return null;
      }
      // console.log("slip[0].currentBoat after push: ", slip[0].current_boat);
      return datastore.save({"key":slip_key, "data":slip[0]});
  });
}


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

// POST to create a boat
router.post('/slips', function(req, res){
  const fullUrl = req.protocol + '://' + req.get('host') + req.url + '/';
  if (!req.body.number) {
    res.status(400).json({ 
      "Error":  "The request object is missing the required number" 
    }); 
    return;
  }
  post_slip(req.body.number, req.body.current_boat)
  .then( key => {console.log("req.body: ", req.body);
    res.status(201).json({ 
      "id":  key.id, 
      "number": req.body.number,
      "current_boat": req.body.current_boat || null, 
      "self": fullUrl + key.id
    })} 
  );
});

// GET to get all slips
router.get('/slips', function(req, res){
  const slips = get_slips()
	.then( (slips) => {
        res.status(200).json(slips);
    });
});

// GET to get specific slip
router.get('/slips/:slip_id', function(req, res){
  const reqUrl = req.url;
  const specificSlip = req.params.slip_id; // gets the id of the boat
  const slip = get_slip(specificSlip)
  .then( (slip) => {
    if (slip) {
      slip.self = req.protocol + '://' + req.get('host') + req.url;
      return res.status(200).json(slip);
    }
    return res.status(404).json({"Error": "No slip with this slip_id exists"});
  })
});

// Add a Boat to a Slip
router.put('/slips/:slip_id/:boat_id', function(req, res){
  console.log("Boat ID to get: ", req.params.boat_id);
  get_boat(req.params.boat_id)
  .then((boat) => {
    if(boat === ''){
      // console.log("Res: ", res);
      return res.status(404).json({"Error": "The specified boat and/or slip don’t exist"});
    } else {
      get_slip(req.params.slip_id)
      .then((slip) => {
        if(slip === ''){
          return res.status(404).json({"Error": "The specified boat and/or slip don’t exist"});
        } else if (slip.current_boat !== null) {
          res.status(403).json({"Error": "The slip is not empty"});
        } else {
            put_boat(req.params.slip_id, req.params.boat_id)
            .then(res.status(204).end());
          }
      })
    }
  })
});

// Delete a slip route
router.delete('/slips/:slip_id', function(req, res){
  get_slip(req.params.slip_id)
  .then((slip) => {
    console.log("slip in Delete: ", slip);
    if(slip === '') {
      return res.status(404).json({"Error": "No slip with this slip_id exists"});
    }
    delete_slip(req.params.slip_id).then(res.status(204).end())
  })
});

// Delete a boat route
router.delete('/boats/:boat_id', function(req, res){
  get_boat(req.params.boat_id)
  .then((boat) => {
    console.log("Boat in Delete: ", boat);
    if(boat === '') {
      return res.status(404).json({"Error": "No boat with this boat_id exists"});
    }
    delete_boat(req.params.boat_id).then(res.status(204).end())
  })
});

/* ------------- End Controller Functions ------------- */

app.use('/', router);

// Listen to the App Engine-specified port, or 8080 otherwise
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});