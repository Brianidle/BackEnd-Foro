const typeDefs = require('./schema');
const resolvers = require('./resolvers');
const jwt = require('jsonwebtoken');

const cors = require('cors');
const { ApolloServer } = require('apollo-server-express');

require('dotenv').config();

const db = require('./db');
const express = require('express');

const port = process.env.PORT || 4000;
const DB_HOST = process.env.DB_HOST;

const models = require('./models');

//---------------------------------------------------------------------

const app = express();

var corsOptions = {
  origin: process.env.ACAOrigin_URL,
  credentials: true
};

app.use(cors(corsOptions));

app.get("/foroApi/authCookies", (req, res) => {
  try {
    let token = req.headers.authorization;
    const idUser = getUser(token);
    let usersessionCookie = 'user_session=' + token + '; secure; SameSite=None';
    let cookiesConcatenationString = usersessionCookie;
    
    console.log("userssionCookie");
    console.log(cookiesConcatenationString);

    // console.log('Set-Cookie', 'user_session=' + token + '; secure; SameSite=None');

    // res.setHeader('Set-Cookie', 'user_session=' + token + '; secure; SameSite=None');
    // res.cookie("user_session", token, {
    //   expires: new Date(Date.now() + 1296000000),
    //   sameSite: 'none'
    // });

    models.User.findOne({ _id: idUser.id }, (err, user) => {
      if (user) {
        let usernameCookie = 'username=' + user.username + '; secure; SameSite=None';
        cookiesConcatenationString.concat(";" + usernameCookie);
        console.log(cookiesConcatenationString);
        console.log(cookiesConcatenationString);
        res.header('Set-Cookie', cookiesConcatenationString);
        // res.cookie("username", user.username, {
        //   expires: new Date(Date.now() + 1296000000),
        //   sameSite: 'none'
        // });
        res.send("Authenticated");
      } else {
        res.send("Not Authenticated");
      }
    });
  }
  catch (err) {
    console.log(err);
  }

});

app.get("/foroApi/logout", (req, res) => {
  logOutClient(res);

  res.send("Logged Out");
});

db.connect(DB_HOST);

const apolloServer = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req, res }) => {
    res.header('Access-Control-Allow-Origin', process.env.ACAOrigin_URL);

    let idUser;
    let jsonCookies;

    let cookies = req.header('Cookie');

    if (cookies) {
      jsonCookies = getJsonCookies(cookies);
      let token = jsonCookies.user_session;
      try {
        idUser = getUser(token);
      }
      catch (err) {
        logOutClient(res);
      }

      if (idUser) {
        let keyNames = Object.keys(jsonCookies);
        let cookiesConcatenationString = "";
        //reenvio de cookies
        for (let i = 0; i < keyNames.length; i++) {
          const keyName = keyNames[i];
          let newCookie=keyName + '=' + jsonCookies[keyName] + '; secure; SameSite=None';

          if (i == 0) {
            cookiesConcatenationString = newCookie;
          } else {
            cookiesConcatenationString.concat(';' + newCookie);
          }

        }
        console.log("res cokies de context");
        console.log(cookiesConcatenationString);
        console.log(cookiesConcatenationString);
        res.header('Set-Cookie', cookiesConcatenationString);

        // res.cookie(keyName, jsonCookies[keyName], {
        //   expires: new Date(Date.now() + 1296000000),
        //   sameSite: 'none'
        // });
      }

    }
    return { models, idUser };
  }
});

apolloServer.applyMiddleware({ app, path: '/foroApi' });

app.listen({ port }, () =>
  console.log(
    `GraphQL Server running at http://localhost:${port}${apolloServer.graphqlPath}`
  )
);

const getUser = token => {
  if (token) {
    return jwt.verify(token, process.env.JWT_SECRET);
  }
};

const getJsonCookies = (cookiesString) => {
  let jsonCookies;

  let cookiesStringTrim = cookiesString.replace(" ", "");
  let keyEqualValueCookiesArray = cookiesStringTrim.split(";");

  keyEqualValueCookiesArray.forEach(keyEqualValueCookie => {
    let keyValue = keyEqualValueCookie.split("=");
    jsonCookies = { ...jsonCookies, [keyValue[0]]: keyValue[1] }
  });

  return jsonCookies;
};

const logOutClient = (res) => {
  res.header('Set-Cookie', 'user_session=""; secure; SameSite=None;username=""; secure; SameSite=None');
  // res.cookie("user_session", "", {
  //   expire: new Date(Date.now() - 1296000000),
  //   sameSite: 'none'
  // });


  // res.setHeader('Set-Cookie', );


  // res.cookie("username", "", {
  //   expire: new Date(Date.now() - 1296000000),
  //   sameSite: 'none'
  // });
}