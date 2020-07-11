'use strict';
require('dotenv').config();
var http = require('http');
var https = require("https");
var saml2 = require('saml2-js');
var fs = require('fs');
var express = require('express');
var app = express();
var bodyParser = require('body-parser');

var name_id;
var session_index;

app.use(bodyParser.urlencoded({
	extended: true
}));


const options = {
	key: fs.readFileSync('./security/key.pem', 'utf8'),
	cert: fs.readFileSync('./security/cert.pem', 'utf8'),
};

// Create service provider
var sp_options = {
	entity_id: process.env.SAML_ISSUER,
	private_key: fs.readFileSync("./security/key.pem").toString(),
	certificate: fs.readFileSync("./security/cert.pem").toString(),
	assert_endpoint: "https://app.example.com/saml/consume",
	sign_get_request: false,
	allow_unencrypted_assertion: true
};
var sp = new saml2.ServiceProvider(sp_options);

// Create identity provider
var idp_options = {
	sso_login_url: process.env.SAML_ENTRYPOINT,
	sso_logout_url: process.env.SAML_LOGOUTURL,
	certificates: [fs.readFileSync('./security/idp_cert.pem').toString()],
	sign_get_request: false,
	allow_unencrypted_assertion: true
};
var idp = new saml2.IdentityProvider(idp_options);

// ------ Define express endpoints ------

// Endpoint to retrieve metadata
app.get("/metadata.xml", function (req, res) {
	res.type('application/xml');
	res.send(sp.create_metadata());
});

// Starting point for login
app.get("/app/login", function (req, res) {
	sp.create_login_request_url(idp, {}, function (err, login_url, request_id) {
		if (err != null)
			return res.send(500);
		res.redirect(login_url);
	});
});

// Assert endpoint for when login completes
app.post("/saml/consume", function (req, res) {
	var options = { request_body: req.body };
	sp.post_assert(idp, options, function (err, saml_response) {
		if (err != null) {
			console.log('err', err);
			return res.send(500);
		}
		console.log("saml_response", saml_response);
		// Save name_id and session_index for logout
		// Note:  In practice these should be saved in the user session, not globally.
		name_id = saml_response.user.name_id;
		session_index = saml_response.user.session_index;

		res.send(`Hello ${saml_response.user.name_id}!`);
	});
});

// Starting point for logout
app.get("/app/logout", function (req, res) {

	console.log('name_id', name_id);
	console.log('session_index', session_index);
	var options = {
		name_id: name_id,
		session_index: session_index,
	};

	sp.create_logout_request_url(idp, options, function (err, logout_url) {
		console.log('logout_url', logout_url);
		if (err != null)
			return res.send(500);
		res.redirect(logout_url);
	});
});

// Assert endpoint for when login completes
app.get("/app/signout", function (req, res) {
	res.send('Susseccfully Signout User');
});

app.get
//app.listen(3000);

//app.listen(process.env.PORT || 3000);

http.createServer(app).listen(8080);
https.createServer(options, app).listen(8443);