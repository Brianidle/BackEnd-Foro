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
    let cookiesArray = [];
    cookiesArray.push(usersessionCookie);

    models.User.findOne({ _id: idUser.id }, (err, user) => {
      if (user) {
        let usernameCookie = 'username=' + user.username + '; secure; SameSite=None';
        cookiesArray.push(usernameCookie);

        console.log(cookiesArray);
        res.setHeader('Set-Cookie', cookiesArray);

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

    let idUser;
    let jsonCookies;

    let cookies = req.header('Cookie');

    if (cookies) {
      jsonCookies = getJsonCookies(cookies);
      console.log("Cookies de context")
      console.log(jsonCookies);
      let token = jsonCookies.user_session;
      
      try {
        idUser = getUser(token);
      }
      catch (err) {
        console.log("No se pudo decifrar el token recibido token="+token);
        logOutClient(res);
      }

      if (idUser) {
        let keyNames = Object.keys(jsonCookies);
        let cookiesArray = [];

        //reenvio de cookies
        for (let i = 0; i < keyNames.length; i++) {
          const keyName = keyNames[i];
          let newCookie=keyName + '=' + jsonCookies[keyName] + '; secure; SameSite=None';

          cookiesArray.push(newCookie);

        }
        console.log("res cookies de context");
        console.log(cookiesArray);
        res.setHeader('Set-Cookie', cookiesArray);

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
  res.setHeader('Set-Cookie', ['user_session=""; secure; SameSite=None','username=""; secure; SameSite=None']);
}