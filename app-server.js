const express = require('express');
const bcrypt = require("bcrypt");
const app = express();
var cors = require('cors')
const port = process.env.PORT || 4000;
const ObjectId = require("mongodb").ObjectID;
const MongoClient = require('mongodb').MongoClient;

// Make sure you place body-parser before your CRUD handlers!
//app.use(bodyParser.urlencoded({ extended: true }));

//If you are using Express >= 4.16.0, body parser has been re-added under the methods express.json() and express.urlencoded().
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());


const uri = "mongodb+srv://oms-dev:9PHjdFOkMoo45Hoq@cluster0.qjjx8.mongodb.net/burrows-ordertracker?retryWrites=true&w=majority";;
const SALT = 10;
//const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });



app.get('/', (req, res) => {
  res.send('Orders Tracker API!');
});


app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);

  MongoClient.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(client => {
      console.log('Connected to Database')

      const db = client.db("burrows-ordertracker");
      const orderCollection = db.collection("order");
      const productCollection = db.collection("product");
      const userCollection = db.collection("usr");

      //*******POST
      //method to add order to order collection
      app.post("/que-order", (request, response) => {
        orderCollection.insertOne(request.body, (error, result) => {
          if (error) {
            return response.status(500).send(error);
          }

          response.send(result.result);
        });

      });

      //method to add user
      app.post("/user", async (request, response) => {
        request.body.password = await bcrypt.hash(request.body.password, SALT);

        userCollection.insertOne(request.body, (error, result) => {
          if (error) {
            return response.status(500).send(error);
          }

          response.send(result.result);
        });
      });

      //**********GET
      //method to get orders by employer
      app.get("/org/orders/:sortField/:sortOrder/:orgId/:status/:prodName/:searchText/:startDate/:endDate", (request, response) => {
        console.log('satus filter: ' + request.params.status);
        console.log('search text name filter: ' + request.params.searchText);
        console.log('product name filter: ' + request.params.prodName);
        console.log("start in MS: " + request.params.startDate);
        console.log("end in MS: " + request.params.endDate);

        let regExText = '';
        let sorting = { orderDate: 1 };
        let sortValue = request.params.sortOrder === 'up' ? 1 : -1;
        //let startMS = parseInt(request.params.startDate), endMS = parseInt(request.params.endDate);

        if (request.params.searchText !== 'none') {
          regExText = '.*' + request.params.searchText + '.*';
        }

        let orFilter = [
          {
            orgId: request.params.orgId
          }
        ];
        let statusFilter = { orgId: request.params.orgId };
        let prodNameFilter = statusFilter;
        let dateFilter = {
          orderDate: {
            $ne: null
          }
        }

        //check for ordering
        if (request.params.sortField.trim() === 'Order ID') {
          sorting = { refId: sortValue };
        } else if (request.params.sortField.trim() === 'Customer Name') {
          sorting = { customerName: sortValue }
        } else if (request.params.sortField.trim() === 'Address') {
          sorting = { address1: sortValue };
        } else if (request.params.sortField.trim() === 'Product Name') {
          sorting = { productName: sortValue };
        } else if (request.params.sortField.trim() === 'City') {
          sorting = { city: sortValue };
        } else if (request.params.sortField.trim() === 'Province') {
          sorting = { province: sortValue };
        } else if (request.params.sortField.trim() === 'Quantity') {
          sorting = { qty: sortValue };
        } else if (request.params.sortField.trim() === 'Price') {
          sorting = { price: sortValue };
        } else if (request.params.sortField.trim() === 'Order Date') {
          sorting = { orderDate: sortValue };
        } else if (request.params.sortField.trim() === 'Email Address') {
          sorting = { email: sortValue };
        } else if (request.params.sortField.trim() === 'Status') {
          sorting = { status: sortValue };
        }

        //create search filters
        if (request.params.status !== 'Any Status') {
          statusFilter = { status: request.params.status };
        }

        if (request.params.prodName !== 'All Products') {
          prodNameFilter = { productName: request.params.prodName };
        }

        if (request.params.searchText !== 'none') {
          orFilter = [
            {
              refId: { $regex: regExText, $options: 'i' }
            },
            {
              customerName: { $regex: regExText, $options: 'i' }
            },
            {
              payType: { $regex: regExText, $options: 'i' }
            },
            {
              country: { $regex: regExText, $options: 'i' }
            },
            {
              city: { $regex: regExText, $options: 'i' }
            },
            {
              province: { $regex: regExText, $options: 'i' }
            },
            {
              phone: { $regex: regExText, $options: 'i' }
            },
            {
              email: { $regex: regExText, $options: 'i' }
            },
            {
              address1: { $regex: regExText, $options: 'i' }
            },
            {
              address2: { $regex: regExText, $options: 'i' }
            }
          ];
        }

        if (request.params.startDate !== '0' && request.params.endDate !== '0') {
          dateFilter = {
            orderDate: {
              $gte: request.params.startDate,
              $lt: request.params.endDate
            }
          }
        }

        console.log("----or filter value");
        console.log(orFilter);

        console.log("----status filter value");
        console.log(statusFilter);

        console.log("----product filter value");
        console.log(prodNameFilter);

        console.log("----date range filter value");
        console.log(dateFilter);

        console.log("----sorting");
        console.log(sorting);

        orderCollection.find({
          $and: [
            {
              $or: orFilter
            },
            {
              orgId: request.params.orgId
            },
            statusFilter,
            prodNameFilter,
            dateFilter
          ]
        })
          .sort(sorting)
          .toArray((error, result) => {
            if (error) {
              return response.status(500).send(error);
            }

            response.send(result);
          });
      });

      //method to get order by id
      app.get("/order/:id", (request, response) => {
        orderCollection.findOne({ "_id": new ObjectId(request.params.id) }, (error, result) => {
          if (error) {
            return response.status(500).send(error);
          }

          response.send(result);
        });
      });

      //method to get users by id
      app.get("/user/:id", (request, response) => {
        userCollection.findOne({ "_id": new ObjectId(request.params.id) }, (error, result) => {
          if (error) {
            return response.status(500).send(error);
          }

          response.send(result);
        });
      });

      //method to get products by employer
      app.get("/org/products/:orgId", (request, response) => {
        productCollection.find({ "orgId": request.params.orgId }).toArray((error, result) => {
          if (error) {
            return response.status(500).send(error);
          }

          response.send(result);
        });
      });

      //method to get order count for each status
      app.get("/org/order-count/:orgId/:statusName", (request, response) => {

        orderCollection.find({ orgId: request.params.orgId, status: request.params.statusName })
          .count()
          .then(result => {
            console.log("Checking status:(" + request.params.statusName + ") count..");
            console.log(result);
            let dataResult = { "count": result };

            response.send(dataResult);
          })
          .catch(error => {
            return response.status(500).send(error);
          });
      });


      //**********PUT
      //method to update user
      app.put("/user", (request, response) => {

        userCollection.findOneAndUpdate(
          { "_id": new ObjectId(request.body.id) },
          {
            $set: {
              fname: request.body.firstname,
              lname: request.body.lastname,
            }
          },
          {
            upsert: true
          }
        )
          .then(result => {
            return response.send(result);
          })
          .catch(error => {
            return response.status(500).send(error);
          });

      });

      //method to update order
      app.put("/order", (request, response) => {

        orderCollection.findOneAndUpdate(
          { "_id": new ObjectId(request.body.id) },
          {
            $set: {
              country: request.body.country,
              qty: request.body.qty,
              customerName: request.body.customerName,
              city: request.body.city,
              province: request.body.province,
              phone: request.body.phone,
              email: request.body.email,
              address1: request.body.address1,
              address2: request.body.address2,
              status: request.body.status
            }
          },
          {
            upsert: true
          }
        )
          .then(result => {
            return response.send(result);
          })
          .catch(error => {
            return response.status(500).send(error);
          });

      });


      //**********DELETE
      //method to delete users by id
      app.delete("/user/:id", (request, response) => {
        userCollection.findOneAndDelete(
          { "_id": new ObjectId(request.params.id) }
        )
          .then(result => {
            return response.send(result);
          })
          .catch(error => {
            return response.status(500).send(error);
          });

      });

      //method to delete orders by id
      app.delete("/order/:id", (request, response) => {
        orderCollection.findOneAndDelete(
          { "_id": new ObjectId(request.params.id) }
        )
          .then(result => {
            return response.send(result);
          })
          .catch(error => {
            return response.status(500).send(error);
          });

      });


      //**********LOGIN
      app.use('/login', async (request, response) => {
        console.log("test the login");
        console.log(request.body);
        let pwd = request.body.password;


        userCollection.findOne({ userId: { $eq: request.body.username } }, (error, result) => {
          if (error) {
            return response.status(500).send(error);
          }

          let tokenString = '', userfullName = '', isOwner = 'false', orgId= '0';

          if (!result) {
            console.log("got NO user");

            response.send({
              token: tokenString,
              fullName: userfullName,
              owner: isOwner
            });

          } else {
            console.log("got a user, checking for password validity");
            console.log(result);
            userfullName = result.fname + ' ' + result.lname;
            isOwner = result.isOwner;

            //Check password using bcrypt compare
            bcrypt.compare(pwd, result.password, function (err2, result2) {
              if (err2) {
                return response.status(500).send(err2);
              }

              console.log(result2);
              if (result2) {
                console.log("password does match");
                tokenString = 'test123';
                orgId = result.orgId;
              } else {
                console.log("password does not match");
              }

              response.send({
                token: tokenString,
                fullName: userfullName,
                owner: isOwner,
                organization: orgId
              });

            });
          }
        });

      });

    })
    .catch(error => console.error(error));



});