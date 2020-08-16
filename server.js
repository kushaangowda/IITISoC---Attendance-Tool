const express = require('express');
const logger = require('morgan');		// store info or logging
const ejs = require('ejs');
const bodyParser = require('body-parser'); // for post data
const url = require('url');
const schedule = require('node-schedule');
const passport = require('passport');
const Stratergy = require('passport-local').Stratergy;
const session = require('express-session');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');
const storage = require('node-sessionstorage');

//------------------------------------------------------------------------------------------------------------------------------
//copy from settings/service accounts in firebase
//------------------------------------------------------------------------------------------------------------------------------
const admin = require('firebase-admin');

const serviceAccount = require('./iitisoc-firebase-adminsdk-wlvoh-f67084ac38.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// //------------------------------------------------------------------------------------------------------------------------------

// var database = firebaseAdmin.database();

var port = 3000;

var sess = '';

schedule.scheduleJob({hour: 1, minute: 0}, function(){
    reset_data(db);
});

schedule.scheduleJob({hour: 0, minute: 0}, function(){
    add_data_to_admin(db);
});


//create instance of express app
var app = express();

//to serve html and js in ejs
app.set('view engine', 'ejs');

//we want to send css, images, and other static files from folder views
app.use(express.static('views'));
app.set('views',__dirname + '/views')

// give server access to post data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false}));

// app.use(cookieParser);

//logging in development mode
app.use(logger('dev'));

// // '/' stands for root url
app.get('/home_student',(req,res)=>{

	//Add stuff to firestore db
	

	const docRef = db.collection('Student').doc('2019 list');

	home_student_stuff(db,res);
 });

app.get('/',(req,res)=>{
	res.render('index.ejs');
})

app.get('/mark_attendance', (req,res)=>{
	mark_attendance_stuff(db,res,req);
});

app.get('/admin_remove', (req,res)=>{
	if(sess==''){
		res.redirect('/admin_login')
	}
	admin_remove_stuff(db,res,req);
});

app.get('/admin_login',(req,res)=>{
	res.render('admin_login.ejs');
})


app.get('/admin_change_details',(req,res)=>{
	if(sess==''){
		res.redirect('/admin_login')
	}
	admin_change_details_stuff(db,res);
})


app.get('/admin_add',(req,res)=>{
	if(sess==''){
		res.redirect('/admin_login')
	}
	res.render('admin_add.ejs');
})

app.get('/admin_change',(req,res)=>{
	if(sess==''){
		res.redirect('/admin_login')
	}
	admin_change_stuff(db,res,req);
})


app.get('/update',(req,res)=>{
	var id = {}
	id[`${req.query.id}.Attendance`] = true;
	const cityRef = db.collection('Student').doc('2019 list');
	cityRef.update(id);
	res.redirect('/');
});

app.get('/remove',(req,res)=>{
	const FieldValue = admin.firestore.FieldValue;
	var id = {}
	id[`${req.query.id}`] = FieldValue.delete();
	const cityRef = db.collection('Student').doc('2019 list');
	cityRef.update(id);
	res.redirect('/admin_change_details');
});

app.get('/logout',(req,res)=>{
	sess='';
	res.redirect('/admin_login');
})

app.get('/admin_home',(req,res)=>{
	if(sess==''){
		res.redirect('/admin_login')
	}
	res.render('admin_home.ejs');
})

app.get('/logout',(req,res)=>{
	storage.removeItem("key");
	res.redirect('admin_login.ejs');
})


// app.post('/',(req,res)=>{
// 	var breakfast = req.body.breakfast;
// 	res.render('result.ejs', {breakfast : breakfast});
// });

app.listen(port);

async function home_student_stuff(dba,res) {
  // [START get_document]
  const cityRef = dba.collection('Student').doc('2019 list');
  const doc = await cityRef.get();
  if (!doc.exists) {
    console.log('No such document!');
  } else {
    console.log('Document data:', doc.data());
    res.render('home.ejs',{students:doc.data()});
  }
}

async function mark_attendance_stuff(dba,res,req) {
  // [START get_document]
  const cityRef = dba.collection('Student').doc('2019 list');
  const doc = await cityRef.get();
  if (!doc.exists) {
    console.log('No such document!');
  } else {
    console.log('Document data:', doc.data());
    res.render('Mark_attendance.ejs',{students:doc.data(),id:req.query.id});
  }
}

async function admin_change_details_stuff(dba,res) {
  // [START get_document]
  const cityRef = dba.collection('Student').doc('2019 list');
  const doc = await cityRef.get();
  if (!doc.exists) {
    console.log('No such document!');
  } else {
    console.log('Document data:', doc.data());
    res.render('admin_change_details.ejs',{students:doc.data()});
  }
}

async function admin_remove_stuff(dba,res,req) {
  // [START get_document]
  const cityRef = dba.collection('Student').doc('2019 list');
  const doc = await cityRef.get();
  if (!doc.exists) {
    console.log('No such document!');
  } else {
    console.log('Document data:', doc.data());
    res.render('admin_remove.ejs',{students:doc.data(),id:req.query.id});
  }
}

async function admin_change_stuff(dba,res,req) {
  // [START get_document]
  const cityRef = dba.collection('Student').doc('2019 list');
  const doc = await cityRef.get();
  if (!doc.exists) {
    console.log('No such document!');
  } else {
    console.log('Document data:', doc.data());
    res.render('admin_change.ejs',{students:doc.data(),id:req.query.id});
  }
}

app.use(express.urlencoded());

// Parse JSON bodies (as sent by API clients)
app.use(express.json());

// Access the parse results as request.body
app.post('/admin_add', function(req, res){
	if(sess==''){
		res.redirect('/admin_login')
	}

    var name = (req.body.name);
    var rno = (req.body.rno);
    admin_add_stuff(db,name,rno,res);
});

app.post('/admin_change', function(req, res){
	if(sess==''){
		res.redirect('/admin_login')
	}

    var name = (req.body.name);
    var rno = (req.body.rno);
    admin_change_post_stuff(db,name,rno,res,req);
});

app.post('/admin_login', function(req,res){
	var email = req.body.email;
	var password = req.body.password;
	authenticate(email,password,db,res);

});

app.post('/admin_home', function(req, res){
	if(sess==''){
		res.redirect('/admin_login')
	}

    var date = (req.body.date);
    console.log(date);
    admin_home_post_stuff(db,date,res);
});

async function admin_add_stuff(dba,name,rno,res) {
  // [START get_document]
  const cityRef = dba.collection('Student').doc('2019 list');
  const doc = await cityRef.get();
  if (!doc.exists) {
    console.log('No such document!');
  } else {
    console.log('Document data:', doc.data());
    var i=0;
    var c=0;
    for (key in doc.data()){ 
    	i=i+1;
    	if(key!=i){
    		c=1;
    		break;
    	}
    }
    if(c==0){
    i=i+1;}
    console.log(i);

    var id = {}
	id[`${i}[Attendance]`] = false;
	id[`${i}[Name]`] = name;
	id[`${i}[Rno]`] = rno;
	const cityRef = db.collection('Student').doc('2019 list');

    var data = {
		[`${i}`]:{
			Attendance: false,
			Name: name,
			Rno: Number(rno)
		}
	};
	cityRef.set(data,{merge:true});
	res.redirect('/admin_change_details');
    
  }
}

async function admin_change_post_stuff(dba,name,rno,res,req) {
  // [START get_document]
  const id = req.query.id;
  const cityRef = dba.collection('Student').doc('2019 list');
  const doc = await cityRef.get();
  if (!doc.exists) {
    console.log('No such document!');
  } else {
    console.log('Document data found', doc.data());
  }
    

    var data = {
		[`${id}`]:{
			Attendance: false,
			Name: name,
			Rno: Number(rno)
		}
	};
	cityRef.set(data,{merge:true});
	res.redirect('/admin_change_details');
}

async function admin_home_post_stuff(dba,fulldate,res) {
  // [START get_document]
  	const fullDate = String(fulldate);
  	var year = (fullDate.slice(0,4));
	var month = (fullDate.slice(5,7));
	var date = (fullDate.slice(-2));
	if(date[0]=='0')
		date = date[1];
	if(month[0]=='0')
		month = month[1];
	const fullDateModified = date+'-'+month+'-'+year;

  	const adminRef = dba.collection('admin').doc('student list 2019');
	const doc = await adminRef.get();
	const student = doc.data();
  	if (!doc.exists) {
    	console.log('No such document!');
  	} else {
    	console.log('Document data found', doc.data());
    	var c=0;
    	for(key in doc.data()){
    		if(key==fullDateModified){
    			var doc1 = student[key];
    			c=1;
    			res.render('admin_home.ejs',{students:doc1});
    			break;
    		}
    	}
    	if(c==0){
    		res.render('admin_home.ejs',{error:'invalid date'});
    	}
  	}
}

async function reset_data(dba){
	const cityRef = dba.collection('Student').doc('2019 list');
	  const doc = await cityRef.get();
	  if (!doc.exists) {
	    console.log('No such document!');
	  } else {
	    console.log('Document data:', doc.data());
	    
	    for (key in doc.data()){
	    	var id={};
	    	id[`${key}.Attendance`] = false;
			cityRef.update(id);
		}
	  }
}

async function add_data_to_admin(dba){
	var d = new Date();
	var date = d.getDate();
	var month = d.getMonth()+1;
	var year = d.getFullYear();
	var fullDate = date + '-' + month + '-' + year;
	const cityRef = dba.collection('Student').doc('2019 list');
	const adminRef = dba.collection('admin').doc('student list 2019');
	const doc = await cityRef.get();
	const student = doc.data();
	if (!doc.exists) {
		console.log('No such document!');
	} else {
	    console.log('Document data:', doc.data());
	  
	    for (key in student){
	  		if(student[key].Attendance == false){
	  			var data = {
	  				[`${fullDate}`]:{
						[`${student[key].Name}`]:{
							Rno: Number(student[key].Rno)
						}
					}
				};
				adminRef.set(data,{merge:true});
	  		}
	  	}
	}
}

async function authenticate(email,password,dba,res){
	const docRef = dba.collection('admin_users').doc('admin users list');
	const doc = await docRef.get();
	const adminList = doc.data();
	var error = '';
	var c=0;
	for(key in doc.data()){
		if(key==email){
			c=1;
			if(password==adminList[key]){
				sess = 'hello';
				res.redirect('/admin_home');
			}
			else{
				error = 'password incorrect';
				res.render('admin_login.ejs',{error:error});
			}
		}
	}
	if(c==0){
		error = 'incorrect email ID';
		res.render('admin_login.ejs',{error:error});
	}

}


