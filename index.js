var express = require("express");
var http = require("http");
var app = express();
var cors = require("cors");
const request = require("request");
const url = require("url");

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

app.use(cors());
/* Apis */
app.get("/", (req, res) => {
  res.status(200).send("Welcome to API REST");
});

app.get("/api/items", (req, res) => {
  /*if (req.params.q === undefined) {
    const jsonError = {
      status: "400",
      error: "Faltan parametros",
    };

    res.send(jsonError);
  }*/
  const requestQuery = {
    method: "GET",
    url: "https://api.mercadolibre.com/sites/MLA/search?q=" + req.query.q,
    headers: {},
  };
  var propertiesObject = req.query.q;
  const queryObject = url.parse(req.url, true).query;
  request(requestQuery, propertiesObject, (err, response, body) => {
    if (!err) {
      let jsonResponse = {};
      const arrayCategory = [];
      const items = [];
      const responseQuery = JSON.parse(body);

      for (const result of responseQuery.results) {
        arrayCategory.push(result.category_id);
        items.push({
          id: result.id,
          title: result.title,

          price: {
            currency: result.currency_id,
            amount: result.price,
            decimals: result.price.countDecimals(),
          },
          picture: result.thumbnail,
          condition: result.condition,
          free_shipping: result.shipping.free_shipping,
        });
      }

      jsonResponse = {
        author: {
          name: "Gleiber",
          lastname: "Carreño",
        },
        categories: arrayCategory.unique(),
        items: items,
      };
      //console.log(jsonResponse);
      res.send(JSON.stringify(jsonResponse));
    }
  });
});

app.get("/api/items/:id", (req, res) => {
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

  const queryObject = url.parse(req.url, true).query;
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
        author: {
          name: "Gleiber",
          lastname: "Carreño",
        },
        item: {
          id: responseQueryId.id,
          title: responseQueryId.title,

          price: {
            currency: responseQueryId.currency_id,
            amount: responseQueryId.price,
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
