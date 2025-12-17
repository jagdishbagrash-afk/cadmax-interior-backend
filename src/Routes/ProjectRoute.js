const { AddProject, GetAllProject, GetProjectById, ProjectDelete, UpdateProject, GetAllProjectStatus } = require("../Controller/ProjectController");
const { upload } = require("../Utill/S3");

const router = require("express").Router();

router.post("/project/add", upload.single("image"), AddProject);
router.get("/project/list", GetAllProject);
router.get("/project/details/:id", GetProjectById);
router.post("/project/edit/:id", upload.single("image"), UpdateProject);
router.post("/project/status", GetAllProjectStatus);

router.post("/project/delete/:id", ProjectDelete);

module.exports = router;