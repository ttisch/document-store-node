// server.js

// BASE SETUP
// =============================================================================

// call the packages we need
var express    = require('express');        // call express
var app        = express();                 // define our app using express
var bodyParser = require('body-parser');
var multer     = require('multer');
var formidable = require("formidable");
var fs         = require('fs');
var stream     = require('stream');
var winston    = require('winston');
var LINQ       = require('node-linq').LINQ;
var path       = require('path');


//winston.add(winston.transports.File, { filename: 'somefile.log' });
var logger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)(),
    new (winston.transports.File)({ filename: 'C:\Users\Thomas\OneDrive\Privat\Projekte\Dev\DocumentStore\document-store\node-api\logfile.txt' })
  ]
});


// configure app to use bodyParser()
// this will let us get the data from a POST
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var port = process.env.PORT || 8082;        // set our port

var mongoose   = require('mongoose');
mongoose.connect('mongodb://localhost:27017/document-store'); // connect to our database
var Document   = require('./app/models/document');

app.use('/uploads', express.static(__dirname + "/uploads"));
var storage    = multer.memoryStorage();
var upload     = multer({storage: storage}).single('file');

// ROUTES FOR OUR API
// =============================================================================
var router = express.Router();              // get an instance of the express Router

// middleware to use for all requests
router.use(function(req, res, next) {
  // enable cors
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, authorization");
  // do logging
  console.log('Incoming Request.');
  next(); // make sure we go to the next routes and don't stop here
});

// test route to make sure everything is working (accessed at GET http://localhost:8082/api)
router.get('/', function(req, res) {
  res.json({ message: 'hooray! welcome to our api!' });
});

// more routes for our API will happen here
// on routes that end in /documents
// ----------------------------------------------------
router.route('/documents')
// create a document (accessed at POST http://localhost:8082/api/documents)
.post(function(req, res) {
  var form = new formidable.IncomingForm();
  form.uploadDir = __dirname + "/Uploads";
  form.keepExtensions = true;
  form.parse(req, function (err, fields, files) {
    if (!err) {
      console.log('Files Uploaded: ' + files.file.name)
      var read_stream = fs.createReadStream(files.file.path);
      var Grid = require('gridfs-stream');
      Grid.mongo = mongoose.mongo;
      var gfs = Grid(mongoose.connection.db);
      var fileId = new mongoose.Types.ObjectId();
      var writestream = gfs.createWriteStream({
        _id:fileId,
        filename: files.file.name
      });
      read_stream.pipe(writestream);

      var document = new Document();      // create a new instance of the Document model
      document.Name = files.file.name;
      document.User = 't.tisch@live.com';
      document.FileId = fileId;
      document.TagString = fields.tags;
      var tags = document.TagString.toString().split(' ');
      for(var i in tags) {
        document.Tags.push(tags[i]);
      }
      document.CreateDate = new Date();

      // save the document and check for errors
      document.save(function(err) {
        if (err) res.send(err);
        res.json({ message: 'Document created!' });
      });
    }
    else console.log(err);
  });
})
// get all the documents (accessed at GET http://localhost:8082/api/documents)
.get(function(req, res) {

  var tagString = "";
  if(req.query.q != undefined) var tagString = req.query.q;
  var tags = tagString.split(' ');

  Document.find(function(err, documents) {
    if (err) res.send(err);

    // var arr = new LINQ(documents)
    // .Where(function(document) { return new LINQ(tags).All(function(tag){ return new LINQ(document.Tags).Any(function(documentTag){ return new LINQ(documentTag).Contains(tag) }) }) }).ToArray();

    // filter documents by submitted query tags
    var list = [];
    for(var i in documents) {
      var document = documents[i];
      var tagExists;
      for(var i2 in tags) {
        var tag = tags[i2];
        tagExists = false;
        for(var i3 in document.Tags) {
          var documentTag = document.Tags[i3];
          if(documentTag.indexOf(tag) > -1) {
            tagExists = true;
          }
        }
        if(document.Name.indexOf(tag) > -1) tagExists=true;
        if(!tagExists) {
          break;
        }
      }
      if(tagExists) list.push(document);
    }

    res.json(list.slice(0, 9));
  });
});

// on routes that end in /documents/:document_id
// ----------------------------------------------------
router.route('/documents/:id')
// get the document with that id (accessed at GET http://localhost:8082/api/documents/:document_id)
.get(function(req, res) {
  var Grid = require('gridfs-stream');
  Grid.mongo = mongoose.mongo;
  var gfs = Grid(mongoose.connection.db);
  gfs.findOne({ _id: req.params.id }, function (err, file) {
    if (err) {
        return res.status(400).send(err);
    }
    else if (!file) {
        return res.status(404).send('Error on the database looking for the file.');
    }

    res.set('Content-Type', file.contentType);
    res.set('Content-Disposition', 'attachment; filename="' + file.filename + '"');

    var readstream = gfs.createReadStream({
      _id: req.params.id
    });

    readstream.on("error", function(err) {
        res.end();
    });
    readstream.pipe(res);
  });



  // Document.findById(req.params.id, function(err, document) {
  //   if (err) res.send(err);
  //
  //   // offer to download file
  //   // res.set('Content-Type', 'image/jpeg');
  //   var Grid = require('gridfs-stream');
  //   Grid.mongo = mongoose.mongo;
  //   var gfs = Grid(mongoose.connection.db);
  //   // gfs.createReadStream({
  //   //     filename: document.Name
  //   // }).pipe(res);
  //
  //
  //
  //   gfs.findOne({ _id: req.params.id, root: 'resume' }, function (err, file) {
  //     if (err) {
  //       return res.status(400).send(err);
  //     }
  //     else if (!file) {
  //       return res.status(404).send('Error on the database looking for the file.');
  //     }
  //
  //     res.set('Content-Type', file.contentType);
  //     res.set('Content-Disposition', 'attachment; filename="' + file.filename + '"');
  //
  //     var readstream = gfs.createReadStream({
  //       _id: req.params.id
  //     });
  //
  //     readstream.on("error", function(err) {
  //       res.end();
  //     });
  //     readstream.pipe(res);
  //
  //     //res.json(document);
  //   });
  });

  // REGISTER OUR ROUTES -------------------------------
  // all of our routes will be prefixed with /api
  app.use('/api', router);

  // START THE SERVER
  // =============================================================================
  app.listen(port);
  console.log('Magic happens on port ' + port);
