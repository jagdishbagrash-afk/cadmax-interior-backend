const { AddProject, GetAllProject, GetProjectById, ProjectDelete, UpdateProject, DeleteProjectImage , GetAllProjectStatus, GetProjectBySlug ,GetAllAdminProject } = require("../Controller/ProjectController");
const { upload } = require("../Utill/S3");

const router = require("express").Router();

router.post("/project/add", upload.fields([
    { name: "image", maxCount: 1 },
    { name: "images", maxCount: 20 },
]), AddProject);
router.get("/project/list", GetAllProject);
router.get("/admin/project/list", GetAllAdminProject);

router.get("/project/details/:id", GetProjectById);
router.post("/project/edit/:id", upload.fields([
    { name: "images", maxCount: 10 },
    { name: "image", maxCount: 1 }, // optional
]), UpdateProject);
router.post("/project/status", GetAllProjectStatus);
router.post("/project/delete/:id", ProjectDelete);
router.get("/project-slug/:slug", GetProjectBySlug);


router.post("/project/delete-image/:id", DeleteProjectImage);


module.exports = router;