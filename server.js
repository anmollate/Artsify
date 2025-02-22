// const http=require('http');
// const fs=require('fs');

// const server=http.createServer((req,res)=>
// {
//     let path='./';
//     switch(req.url)
//     {
//         case '/':
//             path=path+'Login.html';
//             break;
//         case '/Aboutus.html':
//             path=path+'Aboutus.html';
//             break;
//         case '/Forgot.html':
//             path=path+'Forgot.html';
//             break;
//         case '/homepage.html':
//             path=path+'homepage.html';
//             break;
//         case '/signup.html':
//             path=path+'signup.html';
//             break;
//         default:
//             console.log('Error');

//     }

//     fs.readFile(path,(err,data)=>
//     {
//         if(err)
//         {
//             console.log(err);
//             res.end();
//         }
//         else
//         {
//             res.write(data);
//             res.end();
//         }
//     });

// });

// server.listen(1125,'localhost',()=>
// {
//     console.log('Server Listening At Localhost:1125');
// });