const { login } = require("../Controller/AdminController");
const { DeleteUser } = require("../Controller/AuthController");

const AdminRoute = require("express").Router();

AdminRoute.post("/admin/login", login)

AdminRoute.post("/user/delete/:id", DeleteUser);


module.exports = AdminRoute;