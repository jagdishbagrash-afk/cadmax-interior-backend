const { AddProject, GetAllProject, GetProjectById, UpdateProject, ToggleProjectStatus, GetAllProjectStatus } = require("../Controller/ProjectController");
const { upload } = require("../Utill/S3");

const router = require("express").Router();

router.post("/project/add", upload.single("image"), AddProject);
router.get("/project/list", GetAllProject);
router.get("/project/:id", GetProjectById);
router.post("/project/edit/:id", upload.single("image"), UpdateProject);
router.post("/project/status/:id", ToggleProjectStatus);
router.post("/project/status", GetAllProjectStatus);

module.exports = router;