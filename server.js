#!/bin/env node
//  OpenShift sample Node application
var express = require('express');
var fs      = require('fs');
var path      = require('path');
var mongojs = require('mongojs');
var ObjectId = mongojs.ObjectId; 
var db = require("./db.js"); 
var moment = require('moment');
var ejs = require('ejs');


var SampleApp = function() {

    //  Scope.
    var self = this;


    /*  ================================================================  */
    /*  Helper functions.                                                 */
    /*  ================================================================  */

    /**
     *  Set up server IP address and port # using env variables/defaults.
     */
    self.setupVariables = function() {
        //  Set the environment variables we need.
        self.ipaddress = process.env.OPENSHIFT_NODEJS_IP;
        self.port      = process.env.OPENSHIFT_NODEJS_PORT || 8080;

        if (typeof self.ipaddress === "undefined") {
            //  Log errors on OpenShift but continue w/ 127.0.0.1 - this
            //  allows us to run/test the app locally.
            console.warn('No OPENSHIFT_NODEJS_IP var, using 127.0.0.1');
            self.ipaddress = "127.0.0.1";
        };
    };


    /**
     *  Populate the cache.
     */
    self.populateCache = function() {
        if (typeof self.zcache === "undefined") {
            self.zcache = { 'index.html': '' };
        }

        //  Local cache for static content.
        self.zcache['index.html'] = fs.readFileSync('./index.html');
        self.zcache['ngos.html'] = fs.readFileSync('./ngos.html');
        self.zcache['about.html'] = fs.readFileSync('./about.html');
    };


    /**
     *  Retrieve entry (content) from cache.
     *  @param {string} key  Key identifying content to retrieve from cache.
     */
    self.cache_get = function(key) { return self.zcache[key]; };


    /**
     *  terminator === the termination handler
     *  Terminate server on receipt of the specified signal.
     *  @param {string} sig  Signal to terminate on.
     */
    self.terminator = function(sig){
        if (typeof sig === "string") {
           console.log('%s: Received %s - terminating sample app ...',
                       Date(Date.now()), sig);
           process.exit(1);
        }
        console.log('%s: Node server stopped.', Date(Date.now()) );
    };


    /**
     *  Setup termination handlers (for exit and a list of signals).
     */
    self.setupTerminationHandlers = function(){
        //  Process on exit and signals.
        process.on('exit', function() { self.terminator(); });

        // Removed 'SIGPIPE' from the list - bugz 852598.
        ['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT',
         'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM'
        ].forEach(function(element, index, array) {
            process.on(element, function() { self.terminator(element); });
        });
    };


    /*  ================================================================  */
    /*  App server functions (main app logic here).                       */
    /*  ================================================================  */

    /**
     *  Create the routing table entries + handlers for the application.
     */
    self.createRoutes = function() {
        self.routes = { };

  

        self.routes['/'] = function(req, res) {
            res.setHeader('Content-Type', 'text/html');
            res.send(self.cache_get('index.html') );
        };

        self.routes['/campaign/:id'] = function(req, res) {
            res.setHeader('Content-Type', 'text/html');
             var campaign = db.collection('campaign');
            db.campaign.findOne({ _id: ObjectId(req.params.id)}, function(err, docs) {
                if(!err){
                    res.render('campaign.html', { campaign: docs });
                }
            }); 
            
        };

        self.routes['/ngo/:id'] = function(req, res) {
            res.setHeader('Content-Type', 'text/html');
            var ngo = db.collection('ngo'),
            campaign = db.collection('campaign');
            db.ngo.findOne({ _id: ObjectId(req.params.id)}, function(err, docs) {
                var ngo_campaigns = db.campaign.find(
                        {_id: { $in : docs.campaigns } } ,
                        {
                                            "img": true,
                                            "mission": true,
                                            "name":true,
                                            "shortDesc":true,
                                            "url":true
                                        },
                        function(er,dc){
                            if(er){

                            }else{
                                docs.campaigns = dc;
                                res.render('ngo.html', { ngo: docs });
                            }
                            
                        });
                  
            }); 
            
        };

        self.routes['/ngos'] = function(req, res) {
            res.setHeader('Content-Type', 'text/html');
            res.send(self.cache_get('ngos.html') );
        };

        /*---------Render the about page for website---------*/
        self.routes['/about'] = function(req, res) {
            res.setHeader('Content-Type', 'text/html');
            res.send(self.cache_get('about.html') );
        };

    };


    /**
     *  Initialize the server (express) and create the routes and register
     *  the handlers.
     */
    self.initializeServer = function() {
        self.createRoutes();
        self.app = express();

        //  Add handlers for the app (from the routes).
        for (var r in self.routes) {
            self.app.get(r, self.routes[r]);
        }
        require('./app/routes/apiroutes')(self);
    };


    /**
     *  Initializes the sample application.
     */
    self.initialize = function() {
        self.setupVariables();
        self.populateCache();
        self.setupTerminationHandlers();

        // Create the express server and routes.
        self.initializeServer();
    };


    /**
     *  Start the server (starts up the sample application).
     */
    self.start = function() {
        //  Start the app on the specific interface (and port).
        
        self.app.locals.formatDate = function(date){
            return moment(date).format('MMMM Do YYYY');
        }
        self.app.engine('html', ejs.renderFile);
        self.app.use(express.static(path.join(__dirname, 'public')));
        self.app.listen(self.port, self.ipaddress, function() {
            console.log('%s: Node server started on %s:%d ...',
                        Date(Date.now() ), self.ipaddress, self.port);
        });

    };

};   /*  Sample Application.  */



/**
 *  main():  Main code.
 */
var zapp = new SampleApp();
zapp.initialize();
zapp.start();

