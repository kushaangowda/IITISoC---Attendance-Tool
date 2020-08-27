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
const sesssionStorage = require('node-sessionstorage');
const readXlsxFile = require('read-excel-file/node');
const xlsxtojson = require("xlsx-to-json-lc");
const xlstojson = require("xls-to-json-lc");
const multer = require('multer');
const nodemailer = require('nodemailer');
const Entities = require('html-entities').XmlEntities;
const md5 = require('md5');
const entities = new Entities();
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


//Document references
const student_2019_list = db.collection('Student').doc('2019 list');
const student_2020_list = db.collection('Student').doc('2020 list');
const admin_student_2019_list = db.collection('admin').doc('student list 2019');
const admin_student_2020_list = db.collection('admin').doc('student list 2020');
const admin_user_list = db.collection("admin_users").doc('admin users list');
const reset_list = db.collection("reset token").doc("token");
const total_days_list = db.collection("total_days").doc("total_days");

var port = process.env.PORT || 3000;

schedule.scheduleJob({hour: 1, minute: 0}, function(){
    reset_data();
});

schedule.scheduleJob({hour: 0, minute: 0}, function(){
    add_data_to_admin();
});

schedule.scheduleJob({minute: 0},function(){
	reset_token_list();
})

schedule.scheduleJob({minute: 30},function(){
	reset_token_list();
})

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

app.use(cookieParser());

app.use(session({
    key: 'user_sid',
    secret: 'somerandonstuffs',
    resave: false,
    saveUninitialized: false,
    cookie: {
        expires: 3600000	//after 1 hour, user will be logged out automatically
    }
}));

app.use((req, res, next) => {
    if (req.cookies.user_sid && !req.session.user) {
        res.clearCookie('user_sid');        
    }
    next();
});

var sessionChecker = (req, res, next) => {
    if (req.session.user && req.cookies.user_sid) {
        res.redirect('/dashboard');
    } else {
        next();
    }    
};


// app.use(cookieParser);

//logging in development mode
app.use(logger('dev'));

// // '/' stands for root url
app.get('/home_student',(req,res)=>{

	//Add stuff to firestore db
	res.render('home.ejs');
 });

app.post('/home_student',(req,res)=>{
	var year = req.body.year;
	home_student_stuff(year,res);
})

app.get('/',(req,res)=>{
	res.render('index.ejs');
})

app.get('/mark_attendance', (req,res)=>{
	mark_attendance_stuff(res,req);
});

app.get('/admin_remove', (req,res)=>{
	if(!req.session.user || !req.cookies.user_sid){
		res.redirect('/admin_login')
	}
	admin_remove_stuff(res,req);
});

app.get('/admin_add_excel_file',(req,res)=>{
	if(!req.session.user || !req.cookies.user_sid){
		res.redirect('/admin_login')
	}
	res.render('admin_add_excel_file.ejs',{user:req.session.user});
})

app.get('/admin_profile',(req,res)=>{
	if(!req.session.user || !req.cookies.user_sid){
		res.redirect('/admin_login')
	}
	res.render('admin_profile.ejs',{username:req.session.user});
})

app.get('/admin_forgot_password',(req,res)=>{
	res.render('admin_forgot_password.ejs');
})

app.post('/admin_forgot_password',(req,res)=>{
	user = req.body.username;
	admin_forgot_password_stuff(user,res);
})


app.get('/admin_change_password',(req,res)=>{
	if(!req.session.user || !req.cookies.user_sid){
		res.redirect('/admin_login')
	}
	res.render('admin_change_password.ejs');
})

app.post('/admin_change_password',(req,res)=>{
	if(!req.session.user || !req.cookies.user_sid){
		res.redirect('/admin_login')
	}
	old_pass = req.body.old_pass;
	new_pass1 = req.body.new_pass1;
	new_pass2 = req.body.new_pass2;
	admin_change_password_stuff(old_pass,new_pass1,new_pass2,req,res);
})

app.get('/admin_login',(req,res)=>{
	if(req.session.user && req.cookies.user_sid){
		res.redirect('/admin_home')
	}
	res.render('admin_login.ejs');
})


app.get('/admin_change_details',(req,res)=>{
	if(!req.session.user || !req.cookies.user_sid){
		res.redirect('/admin_login')
	}
	res.render('admin_change_details.ejs',{user:req.session.user})
})

app.post('/admin_change_details',(req,res)=>{
	if(!req.session.user || !req.cookies.user_sid){
		res.redirect('/admin_login')
	}
	var year = req.body.year;
	admin_change_details_stuff(year,res,req);
	// var final_key = Number(req.body.final_key);
	// console.log('final_key:',final_key);
	// console.log(req.body.data);
	// var data = String(req.body.data);
	// data = data.slice(0,data.length-1);
	// data = data.split(',');
	// console.log('data: ',data);
	// if(data){
	// 	admin_remove_multiple_stuff(data,year,res);
	// }
	// if(req.body.data!=''){
	// 	admin_remove_multiple_stuff(data,year,final_key,req);
	// }
	// console.log('k',req.body.names1);
	// var j=1;
	// console.log(`${`req.body.names${j}`}`)
	// for(var i=1;i<=final_key;i++){
	// 	if([`req.body.names${i}`]=='on'){
	// 		
	// 		break;
	// 	}
	// }


})


app.get('/admin_remove_selected',(req,res)=>{
	var data = req.query.data;
	var year = req.query.year;
	admin_remove_multiple_stuff(data,year,res,req);
})

async function admin_remove_multiple_stuff(data,year,res,req){
	var docRef = db.collection('Student').doc(year+' list');
  	const doc = await docRef.get();
  	if (!doc.exists) {
        console.log('No such document!');
  	} else {
  		var doc1 = await total_days_list.get();
	    var t = doc1.data();
	    var total_days = 0;
	    for(key in t){
	    	total_days = t[key];	
	    }
    	res.render('admin_remove_selected.ejs',{students:doc.data(),data:data,year:year,user:req.session.user,total_days:total_days});
  	}

}

app.get('/admin_add',(req,res)=>{
	if(!req.session.user || !req.cookies.user_sid){
		res.redirect('/admin_login')
	}
	res.render('admin_add.ejs',{user:req.session.user});
})

app.get('/admin_change',(req,res)=>{
	if(!req.session.user || !req.cookies.user_sid){
		res.redirect('/admin_login')
	}
	admin_change_stuff(res,req);
})


app.get('/update',(req,res)=>{
	var id = {}
	id[`${req.query.id}.Attendance`] = true;
	db.collection('Student').doc(req.query.year+' list').update(id);
	res.redirect('/');
});

app.get('/remove',(req,res)=>{
	var docRef = db.collection('Student').doc(req.query.year+' list');
	const FieldValue = admin.firestore.FieldValue;
	var id = {}
	id[`${req.query.id}`] = FieldValue.delete();
	docRef.update(id);
	remove(req,res);
	
});

async function remove(req,res){
	var CollRef = db.collection('admin');
	var rno = req.query.id;
	const FieldValue = admin.firestore.FieldValue;
	const snapshot = await CollRef.get();
	snapshot.forEach(doc1 => {
		for (key in doc1.data()){
	    	var id={};
			id[`${key}.${rno}`] = FieldValue.delete();
			db.collection('admin').doc(doc1.id).update(id);
		}
	});
	res.redirect('/admin_change_details');


	// var docRef2 = db.collection('admin').doc('student list '+req.query.year);
	// var doc2 = await docRef2.get();
	// const FieldValue = admin.firestore.FieldValue;
	// var list = doc2.data();
	// var rno = req.query.id
	// for(key in list){
	// 	var id={};
	// 	id[`${key}.${rno}`] = FieldValue.delete();
	// 	docRef2.update(id);
	// }
	// res.redirect('/admin_change_details');
}

app.get('/remove_multiple',(req,res)=>{
	var docRef = db.collection('Student').doc(req.query.year+' list');
	const FieldValue = admin.firestore.FieldValue;
	var id = {};
	var data = req.query.data;
	for(var i=0;i<data.length;i++){
		id[`${data[i]}`] = FieldValue.delete();
	}
	docRef.update(id);
	remove_multiple(req,res,data);
})

async function remove_multiple(req,res,data){
	var CollRef = db.collection('admin');
	const FieldValue = admin.firestore.FieldValue;
	const snapshot = await CollRef.get();
	snapshot.forEach(doc1 => {
		for (key in doc1.data()){
	    	for(var i=0;i<data.length;i++){
	    		var id={};
				id[`${key}.${data[i]}`] = FieldValue.delete();
				db.collection('admin').doc(doc1.id).update(id);
			}
		}
	});
	res.redirect('/admin_change_details');

	// var docRef2 = db.collection('admin').doc('student list '+req.query.year);
	// var doc2 = await docRef2.get();
	// var list = doc2.data();
	// var id={};
	// const FieldValue = admin.firestore.FieldValue;
	// for(key in list){
	// 	for(var i=0;i<data.length;i++){
	// 		id[`${key}.${data[i]}`] = FieldValue.delete();
	// 		docRef2.update(id);
	// 	}
	// }
	// res.redirect('/admin_change_details');
}

app.get('/logout',(req,res)=>{
	if (req.session.user && req.cookies.user_sid) {
        res.clearCookie('user_sid');
    }
	res.redirect('/admin_login');
})

app.get('/admin_home',(req,res)=>{
	if(!req.session.user || !req.cookies.user_sid){
		res.redirect('/admin_login')
	}
	res.render('admin_home.ejs',{user:req.session.user});
})

// app.get('/logout',(req,res)=>{
// 	storage.removeItem("key");
// 	res.redirect('admin_login.ejs');
// })

app.get('/admin_add_choice',(req,res)=>{
	if(!req.session.user || !req.cookies.user_sid){
		res.redirect('/admin_login')
	}
	res.render('admin_add_choice.ejs',{user:req.session.user});
})

// app.post('/',(req,res)=>{
// 	var breakfast = req.body.breakfast;
// 	res.render('result.ejs', {breakfast : breakfast});
// });

app.listen(port, () => console.log(`listening to PORT ${port}...`));

async function admin_change_password_stuff(old_pass,new_pass1,new_pass2,req,res){
	const doc = await admin_user_list.get();
	var adminList = doc.data();
	if (!doc.exists) {
    	console.log('No such document!');
  	} else {
    	console.log('Document data:', doc.data());
    	for(key in doc.data()){
    		if(key==req.session.user){
    			if(md5(md5(md5(old_pass)))!=adminList[key]){
					res.render('admin_change_password.ejs',{error:'Old password is incorrect'});
				}
				else if(new_pass1!=new_pass2){
					res.render('admin_change_password.ejs',{error: 'Given new passwords do not match'});
				}
				else{
					admin_change_password_stuff1(new_pass1,req,res);
				}
    		}
    	}

  	}

	
}

async function home_student_stuff(year,res) {
  // [START get_document]
  var docRef = db.collection('Student').doc(year+' list');
  const doc = await docRef.get();
  if (!doc.exists) {
    console.log('No such document!');
    res.render('home.ejs',{error:'Invalid year'});
  } else {
    console.log('Document data:', doc.data());
    res.render('home.ejs',{students:doc.data(),year:year});
  }
}

async function mark_attendance_stuff(res,req) {
  // [START get_document]
  const doc = await db.collection('Student').doc(req.query.year+' list').get();
  if (!doc.exists) {
    console.log('No such document!');
  } else {
  	var doc1 = await total_days_list.get();
	var t = doc1.data();
	var total_days = 0;
	for(key in t){
		total_days = t[key];	
	}
    console.log('Document data:', doc.data());
    res.render('Mark_attendance.ejs',{students:doc.data(),year:req.query.year,id:req.query.id,total_days:total_days});
  }
}

async function admin_forgot_password_stuff(user,res) {
  // [START get_document]
  const doc = await admin_user_list.get();
  if (!doc.exists) {
    console.log('No such document!');
  } else {
  	var c=0;
    console.log('Document data:', doc.data());
    for(key in doc.data()){
    	if(key==user){
    		c=1;
    		var chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'; 
		    var token = ''; 
		    for (var i = 20; i > 0; --i) { 
		      token += chars[Math.round(Math.random() * (chars.length - 1))]; 
		    } 
		    var d = new Date();
		    hours = d.getHours();
		    minutes = d.getMinutes();
			 
			user = String(user).slice(0,String(user).length-4);
			var data = {
				[`${user}`]:{
					token:token,
					hours:hours,
					minutes:minutes
				}
			}
			reset_list.set(data,{merge:true});

    		var transporter = nodemailer.createTransport({
				host: 'smtp.mailtrap.io',
			    port: 2525,
			    auth: {
			       user: 'e2696befd750f0',
			       pass: '83225235b2dbea'
			    }
			});

    		var mailOptions = {
			  from: 'no-reply@gmail.com',
			  to: user,
			  subject: 'Reset Password',
			  html: '<p>Click the link given below to reset your password</p><a href="localhost:3000/admin_reset_password/?s='+token+'">Click here</a>'
			};

			transporter.sendMail(mailOptions, function(error, info){
				if (error) {
			    	console.log(error);
			  	} else {
			    	console.log('Email sent: ' + info.response);
			    	res.render('admin_forgot_password.ejs',{success:'Mail sent successfully'});
			  	}
			}); 

    	}
    }
    if(c==0){
    	res.render('admin_forgot_password.ejs',{error:'Username not found'});
    }
  }
}

async function admin_change_details_stuff(year1,res,req) {
  // [START get_document]
  var docRef = db.collection('Student').doc(year1+' list');
  const doc = await docRef.get();
  if (!doc.exists) {
    console.log('No such document!');
    res.render('admin_change_details.ejs',{user:req.session.user,error:'invalid year of admission'})
  } else {
  	var doc1 = await total_days_list.get();
	var t = doc1.data();
	var total_days = 0;
	for(key in t){
		total_days = t[key];	
	}
    console.log('Document data:', doc.data());
    res.render('admin_change_details.ejs',{user:req.session.user,students:doc.data(),year:year1,total_days:total_days});
  }
}

async function admin_remove_stuff(res,req) {
  // [START get_document]
  var docRef = db.collection('Student').doc(req.query.year+' list');
  const doc = await docRef.get();
  if (!doc.exists) {
    console.log('No such document!');
  } else {
  	var doc1 = await total_days_list.get();
	    var t = doc1.data();
	    var total_days = 0;
	    for(key in t){
	    	total_days = t[key];	
	    }
    console.log('Document data:', doc.data());
    res.render('admin_remove.ejs',{students:doc.data(),id:req.query.id,year:req.query.year,user:req.session.user,total_days:total_days});
  }
}

async function admin_change_stuff(res,req) {
  // [START get_document]
  var docRef = db.collection('Student').doc(req.query.year+' list');
  const doc = await docRef.get();
  if (!doc.exists) {
    console.log('No such document!');
  } else {
    console.log('Document data:', doc.data());
    res.render('admin_change.ejs',{students:doc.data(),id:req.query.id,year:req.query.year,user:req.session.user});
  }
}

app.use(express.urlencoded());

// Parse JSON bodies (as sent by API clients)
app.use(express.json());

// Access the parse results as request.body
app.post('/admin_add', function(req, res){
	if(!req.session.user || !req.cookies.user_sid){
		res.redirect('/admin_login')
	}

    var name = (req.body.name);
    var rno = (req.body.rno);
    var hostelname = (req.body.hostelname);
    var roomno = (req.body.roomno);
    var branchname = (req.body.branchname);
    var emailid = (req.body.emailid);
    var phoneno = (req.body.phoneno);
    var year = req.body.year;
    admin_add_stuff(name,rno,hostelname,roomno,branchname,emailid,phoneno,year,res,req);
});

app.post('/admin_change', function(req, res){
	if(!req.session.user || !req.cookies.user_sid){
		res.redirect('/admin_login')
	}

    var name = (req.body.name);
    var rno = (req.body.rno);
    var hostelname = (req.body.hostelname);
    var roomno = (req.body.roomno);
    var branchname = (req.body.branchname);
    var emailid = (req.body.emailid);
    var phoneno = (req.body.phoneno);
    var year = req.query.year;
    admin_change_post_stuff(name,rno,hostelname,roomno,branchname,emailid,phoneno,year,res,req);
});

app.post('/admin_login', function(req,res){
	var email = req.body.email;
	var password = req.body.password;
	authenticate(email,password,res,req);

});

app.post('/admin_home', function(req, res){
	if(!req.session.user || !req.cookies.user_sid){
		res.redirect('/admin_login')
	}
	// var year = req.body.year;
	var hostel = req.body.hostel;
    var date = (req.body.date);
    console.log(date);
    admin_home_post_stuff(date,hostel,res,req);
});

app.get('/admin_reset_password',(req,res)=>{
	var s = req.query.s;
	admin_reset_password_stuff(s,res);
})

app.post('/admin_reset_password',(req,res)=>{
	var s = req.query.s;
	var new_pass1 = req.body.new_pass1;
	var new_pass2 = req.body.new_pass2;
	admin_reset_password_post_stuff(res,s,new_pass1,new_pass2);
})

async function admin_reset_password_post_stuff(res,s,pass1,pass2){
	if(pass1!=pass2){
		res.redirect('/admin_reset_password/?s='+s,{error:'Given passwords do not match'});
	}else{
		const resetDoc = await reset_list.get();
		var list = resetDoc.data();
		var c=0;
		for(key in resetDoc.data()){
			if(list[key].token == s){
				c=1;
				var username = key+'.com';
				// var data2=bcrypt.hash(pass1, 9, function(err, hash) {
				// 	console.log(entities.encode(hash))
				// 	var data1={
				// 		[`${username}`]:entities.encode(hash)
				// 	}
    // 				return data1;
				// });
				pass1 = md5(md5(md5(pass1)));
				console.log(pass1)
				var data = {
					[`${username}`]:pass1
				}
				break;
				
			}
		}
		if(c==1){
			username = String(username);
			var len = username.length;
			username = username.slice(0,len-4);
			const FieldValue = admin.firestore.FieldValue;
			const cityRef = db.collection('reset token').doc('token');
			var datakk={
				[`${username}`]: FieldValue.delete()
			}
			cityRef.update(datakk);
			admin_user_list.set(data,{merge:true});
			res.redirect('/admin_login');
		}
		if(c==0){
			res.redirect('/admin_login');
		}
	}
}

async function admin_reset_password_stuff(s,res){
	const resetDoc = await reset_list.get();
	var list = resetDoc.data();
	var c=0;
	for(key in resetDoc.data()){
		if(list[key].token == s){
			c=1;
			res.render('admin_reset_password.ejs',{username:key+'.com'});
		}
	}
	if(c==0){
		res.redirect('/admin_login');
	}
}



async function admin_add_stuff(name,rno,hostelname,roomno,branchname,emailid,phoneno,year,res,req) {
  // [START get_document]
  var docRef = db.collection('Student').doc(year+' list');
  const doc = await docRef.get();
  if (!doc.exists) {
    console.log('No such document!');
    res.render('admin_add.ejs',{user:req.session.user,error:'document for the given year of admission not found'});
  } else {
    console.log('Document data:', doc.data());
    // var i=0;
    // var c=0;
    // for (key in doc.data()){ 
    // 	i=i+1;
    // 	if(key!=i){
    // 		c=1;
    // 		break;
    // 	}
    // }
    // if(c==0){
    // i=i+1;}
    // console.log(i);

    var data = {
		[`${Number(rno)}`]:{
			Attendance: false,
			Name: name,
			TotalAttendance: Number(0),
			HostelName: hostelname,
			RoomNo: roomno,
			EmailID: emailid,
			PhoneNo: Number(phoneno),
			BranchName: branchname
		}
	};
	docRef.set(data,{merge:true});
	res.render('admin_add.ejs',{user:req.session.user,success:'student added successfully'});
    
  }
}

async function admin_change_post_stuff(name,rno,hostelname,roomno,branchname,emailid,phoneno,year,res,req) {
  // [START get_document]
  var docRef1 = db.collection('Student').doc(year+' list');
  
  const id = req.query.id;
  const doc1 = await docRef1.get();
 
  var list1 = doc1.data();
  
  if (!doc1.exists) {
    console.log('No such document!');
  } else {
  		var ta=0;
    	console.log('Document data found', doc1.data());
    	for(key in doc1.data()){
    		if(Number(key)==Number(id)){
    			ta=list1[key].TotalAttendance;
    			host = list1[key].HostelName;
    			break;
    		}
    	}
    	const FieldValue = admin.firestore.FieldValue;
    	var data1 = {
    		[`${Number(id)}`]: FieldValue.delete()
    	}
    	docRef1.update(data1);
	    var data2 = {
			[`${Number(rno)}`]:{
				Attendance: false,
				Name: name,
				TotalAttendance: Number(ta),
				HostelName: hostelname,
				RoomNo: roomno,
				EmailID: emailid,
				PhoneNo: Number(phoneno),
				BranchName: branchname
			}
		};
		docRef1.set(data2,{merge:true});
    	var docRef2 = db.collection('admin').doc('student list '+host);
 		const doc2 = await docRef2.get();
		var list2 = doc2.data();
		for(key in list2){
			var x = list2[key][id];
			console.log(x);
			if(typeof [`${key}.${Number(id)}`]!='undefined'){
				var data3 = {
					[`${key}.${Number(id)}`]: admin.firestore.FieldValue.delete()
				} 
				docRef2.update(data3);
				var data4 = {
					[`${key}`]:{
						[`${Number(rno)}`]:{
							Name: name,
							TotalAttendance: Number(ta),
							HostelName: hostelname,
							RoomNo: roomno,
							EmailID: emailid,
							PhoneNo: Number(phoneno),
							BranchName: branchname
						}
					}
				};
				docRef2.set(data4,{merge:true});

			}
		}

		res.redirect('/admin_change_details');
  }
}

async function admin_change_password_stuff1(password,req,res) {
  // [START get_document]
  var docRef = db.collection('admin_users').doc('admin users list');
  const doc = await docRef.get();
  if (!doc.exists) {
    console.log('No such document!');
  } else {
    console.log('Document data found', doc.data());
    password = md5(md5(md5(password)));
    var data = {
		[`${req.session.user}`]:password
	};
	docRef.set(data,{merge:true});
	res.redirect('/admin_home');
  }
}

async function admin_home_post_stuff(fulldate,hostel,res,req) {
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
	
	var docRef = db.collection('admin').doc('student list '+hostel);

	const doc = await docRef.get();
	const student = doc.data();
  	if (!doc.exists) {
    	console.log('No such document!');
    	res.render('admin_home.ejs',{user:req.session.user,error:'data not found'});
  	} else {
    	console.log('Document data found', doc.data());
    	var doc1 = await total_days_list.get();
	    var t = doc1.data();
	    var total_days = 0;
	    for(key in t){
	    	total_days = t[key];	
	    }
    	var c=0;
    	for(key in doc.data()){
    		if(key==fullDateModified){
    			var doc1 = student[key];
    			c=1;
    			res.render('admin_home.ejs',{user:req.session.user,students:doc1,total_days:total_days,date:fullDateModified,hostel:hostel});
    			break;
    		}
    	}
    	if(c==0){
    		res.render('admin_home.ejs',{user:req.session.user,error:'invalid date or year of admission'});
    	}
  	}
}

async function reset_data(){

	var CollRef = db.collection('Student');

	const snapshot = await CollRef.get();
	snapshot.forEach(doc1 => {
		for (key in doc1.data()){
	    	var id={};
	    	id[`${key}.Attendance`] = false;
			CollRef.doc(doc1.id).update(id);
		}
	});


	 //  const doc = await student_2019_list.get();
	 //  if (!doc.exists) {
	 //    console.log('No such document!');
	 //  } else {
	 //    console.log('Document data:', doc.data());
	    
	 //    for (key in doc.data()){
	 //    	var id={};
	 //    	id[`${key}.Attendance`] = false;
		// 	student_2019_list.update(id);
		// }
	 //  }
}

async function reset_token_list(){
	var doc = await reset_list.get();
	var listData = doc.data();
	var d = new Date();
	var hour = d.getHours();
	var min = d.getMinutes();
	var sec_now = Number(hour)*60+Number(min)
	for(key in listData){
		var sec = Number(listData[key].minutes) + Number(listData[key].hours)*60;
		if(sec_now>=sec+60){
			const FieldValue = admin.firestore.FieldValue;
			var datakk={
				[`${key}`]: FieldValue.delete()
			}
			reset_list.update(datakk);
		}
	}
}

async function add_data_to_admin(){
	var d = new Date();
	var date = d.getDate();
	var month = d.getMonth()+1;
	var year = d.getFullYear();
	var fullDate = date + '-' + month + '-' + year;
	var CollRef = db.collection('Student');
	var doc = await total_days_list.get();
	var totDay = doc.data();
	var totalDays = 0;
	for(key in doc.data()){
		totalDays = Number(totDay[key]);
	}
	totalDays = totalDays + 1;
	var data = {
		total_days: totalDays
	};
	total_days_list.set(data);

	const snapshot = await CollRef.get();
	snapshot.forEach(doc => {
		var docName = doc.id;
		var year = docName.slice(0,4);
		var student = doc.data();
		for (key in student){
	  		if(student[key].Attendance == false){
	  			var data = {
	  				[`${fullDate}`]:{
						[`${Number(key)}`]:{
							Name: student[key].Name,
							TotalAttendance: Number(student[key].TotalAttendance),
							HostelName: student[key].HostelName,
							RoomNo: student[key].RoomNo,
							EmailID: student[key].EmailID,
							PhoneNo: Number(student[key].PhoneNo),
							BranchName: student[key].BranchName,
							Year:Number(year)
						}
					}
				};
				db.collection('admin').doc('student list '+student[key].HostelName).set(data,{merge:true});
	  		}else{
	  			var t = 1 + Number(student[key].TotalAttendance);
	  			var id={};
	    		id[`${key}.TotalAttendance`] = t;
	  			db.collection('Student').doc(doc.id).update(id);
	  		}
	  	}

	});
}

async function authenticate(email,password,res,req){
	const doc = await admin_user_list.get();
	const adminList = doc.data();
	var error = '';
	var c=0;
	for(key in doc.data()){
		if(key==email){
			c=1;
			password = md5(md5(md5(password)));
			//bcrypt.compare(password, adminList[key], function(err, result) {
			if(password==adminList[key]){
				req.session.user = key;
				res.redirect('/admin_home');
			}else{
			   	error = 'password incorrect';
				res.render('admin_login.ejs',{error:error});
			}
			//});
		}
	}
	if(c==0){
		error = 'incorrect email ID';
		res.render('admin_login.ejs',{error:error});
	}

}

var storage = multer.diskStorage({ //multers disk storage settings
        destination: function (req, file, cb) {
            cb(null, './uploads/')
        },
        filename: function (req, file, cb) {
            var datetimestamp = Date.now();
            cb(null, file.fieldname + '-' + datetimestamp + '.' + file.originalname.split('.')[file.originalname.split('.').length -1])
        }
    });

var upload = multer({ //multer settings
                storage: storage,
                fileFilter : function(req, file, callback) { //file filter
                    if (['xls', 'xlsx'].indexOf(file.originalname.split('.')[file.originalname.split('.').length-1]) === -1) {
                        return callback(new Error('Wrong extension type'));
                    }
                    callback(null, true);
                }
            }).single('file');

app.post('/admin_add_excel_file', function(req, res) {
	if(!req.session.user || !req.cookies.user_sid){
		res.redirect('/admin_login')
	}
        var exceltojson;
        var year = req.body.year;
        upload(req,res,function(err){
            if(err){
                console.log(err);
                return;
            }
            /** Multer gives us file info in req.file object */
            if(!req.file){
                console.log("No file passed");
                return;
            }
            /** Check the extension of the incoming file and 
             *  use the appropriate module
             */
            if(req.file.originalname.split('.')[req.file.originalname.split('.').length-1] === 'xlsx'){
                exceltojson = xlsxtojson;
            } else {
                exceltojson = xlstojson;
            }
            console.log(req.file.path);
            try {
                exceltojson({
                    input: req.file.path,
                    output: null, //since we don't need output.json
                    lowerCaseHeaders:true
                }, function(err,result){
                    if(err) {
                        console.log(err);
                    } 
                    // //res.json({error_code:0,err_desc:null, data: result});
                    // var docRef = db.collection('Student').doc(year+' list');
                    for (key in result){
                    	var data = {
							[`${Number(result[key].rno)}`]:{
								Name: result[key].name,
								Attendance: false,
								TotalAttendance: Number(0),
								HostelName: result[key].hostelname,
								RoomNo: result[key].roomno,
								EmailID: result[key].emailid,
								PhoneNo: Number(result[key].phoneno),
								BranchName: result[key].branchname
							}
						};
						console.log(data);
						console.log(req.body.year+' list');
						// if(Number(key)==0){
						// 	db.collection('Student').doc(req.body.year+' list').set(data);
						// }else{
							db.collection('Student').doc(req.body.year+' list').set(data,{merge:true});
						// }
                    }
                    res.render('admin_add_excel_file.ejs',{user:req.session.user,success:'List added successfully'});
                    
                });
            } catch (e){
                    res.render('admin_add_excel_file.ejs',{user:req.session.user,error:"Corupted excel file"});
            }
        })
})




app.use(function (req,res,next){
	res.status(404).render('404error.ejs');
});
