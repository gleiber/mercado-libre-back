var express = require("express");
var http = require("http");
var app = express();
var cors = require("cors");
const request = require("request");
const url = require("url");
const jwt = require("express-jwt");
const jsonwebtoken = require("jsonwebtoken");

/* funciones auxiliares */
Array.prototype.unique = (function (a) {
  return function () {
    return this.filter(a);
  };
})(function (a, b, c) {
  return c.indexOf(a, b + 1) < 0;
});
Number.prototype.countDecimals = function () {
  if (Math.floor(this.valueOf()) === this.valueOf()) return 0;
  return this.toString().split(".")[1].length || 0;
};

/**
 *
 * @param {*} price
 */
const parseMil = (price) => {
  let num = price;
  const coma = num.toString().indexOf(".") !== -1 ? true : false;

  let number = num.toString().split(".");
  if (coma === true) {
    number = number[0] + "," + number[1];
  }

  num = number
    .toString()
    .split("")
    .reverse()
    .join("")
    .replace(/(?=\d*\.?)(\d{3})/g, "$1.");
  num = num.split("").reverse().join("").replace(/^[\.]/, "");
  return num;
};

app.use(cors());
/* Apis */

const jwtSecret = "gleiberCarreño";
app.get("/firmApi", (req, res) => {
  res.json({
    token: jsonwebtoken.sign(
      {
        name: "Gleiber",
        lastname: "Carreño",
      },
      jwtSecret
    ),
  });
});
app.use(jwt({ secret: jwtSecret, algorithms: ["HS256"] }));

/**
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(" ")[1];

    jsonwebtoken.verify(token, jwtSecret, (err, user) => {
      if (err) {
        return res.sendStatus(403);
      }

      req.user = user;
      next();
    });
  } else {
    res.sendStatus(401);
  }
};

/**
 *
 */
app.get("/api/items", authenticateJWT, (req, res) => {
  // inicializar variables
  const propertiesObject = req.query.q;
  const queryObject = url.parse(req.url, true).query;
  author = req.user;
  const requestQuery = {
    method: "GET",
    url: "https://api.mercadolibre.com/sites/MLA/search?q=" + req.query.q,
    headers: {},
  };

  request(requestQuery, propertiesObject, async (err, response, body) => {
    if (!err) {
      let jsonResponse = {};
      const arrayCategory = [];
      const items = [];
      const responseQuery = await JSON.parse(body);

      if (responseQuery.results.length === 0) {
        const jsonRespuesta = {
          author,
          categories: null,
          items: null,
        };
        res.send(jsonRespuesta);
      } else {
        for (const result of responseQuery.results) {
          items.push({
            id: result.id,
            title: result.title,

            price: {
              currency: result.currency_id,
              amount: parseMil(result.price),
              decimals: result.price.countDecimals(),
            },
            picture: result.thumbnail,
            condition: result.condition,
            free_shipping: result.shipping.free_shipping,
          });
        }
        if (
          responseQuery.filters[0].values[0] !== undefined ||
          responseQuery.filters[0].values[0] !== null
        ) {
          for (const item of responseQuery.filters[0].values[0]
            .path_from_root) {
            arrayCategory.push(item.name);
          }
        }

        jsonResponse = {
          author,
          categories: arrayCategory.unique(),
          items: items.slice(0, 4),
        };
        await res.send(jsonResponse);
      }
    }
  });
});

app.get("/api/items/:id", authenticateJWT, (req, res) => {
  // Retrieve the tag from our URL path
  if (req.params.id === null) {
    const jsonError = {
      status: "400",
      error: "Faltan parametros",
    };

    res.send(jsonError);
  }
  const requestId = {
    method: "GET",
    url: "https://api.mercadolibre.com/items/" + req.params.id,
    headers: {},
  };

  request(requestId, async (err, response, body) => {
    if (!err) {
      let promise = new Promise((resolve, reject) => {
        const requestDescription = {
          method: "GET",
          url:
            "https://api.mercadolibre.com/items/" +
            req.params.id +
            "/description",
          headers: {},
        };
        request(requestDescription, (err, response, body) => {
          const responseDescripcion = JSON.parse(body);
          resolve(responseDescripcion.plain_text);
        });
      });
      let resultDescripcion = await promise;
      let jsonResponseId = {};
      const responseQueryId = JSON.parse(body);

      jsonResponseId = {
        author: req.user,
        item: {
          id: responseQueryId.id,
          title: responseQueryId.title,

          price: {
            currency: responseQueryId.currency_id,
            amount: parseMil(responseQueryId.price),
            decimals: responseQueryId.price.countDecimals(),
          },
          picture: responseQueryId.thumbnail,
          condition: responseQueryId.condition,
          free_shipping: responseQueryId.shipping.free_shipping,
          sold_quantity: responseQueryId.sold_quantity,
          description: resultDescripcion,
        },
      };
      res.send(jsonResponseId);
    }
  });
});

http.createServer(app).listen(8001, () => {
  console.log("Server started at http://localhost:8001");
});
