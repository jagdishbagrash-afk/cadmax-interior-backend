const Project = require("../Model/Project");
const CatchAsync = require("../Utill/catchAsync");
const { errorResponse, successResponse, validationErrorResponse } = require("../Utill/ErrorHandling");
const { deleteFile } = require("../Utill/S3");

exports.AddProject = CatchAsync(async (req, res) => {
    try {
        const { designed, title, brief, solution, content } = req.body;

        if (!title) {
            return validationErrorResponse(res, "Project  name is required", 400);
        }

        let imageUrl = null;

        if (req.file) {
            imageUrl = req.file.location;  
        }

        const Projects = new Project({
            designed, title, brief, solution, content,
            Image: imageUrl,
        });

        const record = await Projects.save();
        return successResponse(res, "project created successfully.", 201, record);

    } catch (error) {
        console.log(error);
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});

exports.GetAllProject = CatchAsync(
    async (req, res) => {
        try {
            const projects = await Project.find().sort({ createdAt: -1 });
            return successResponse(res, "Project list successfully.", 201, projects);
        } catch (error) {
            return errorResponse(res, error.message || "Internal Server Error", 500);
        }
    }
);

exports.GetProjectById = CatchAsync(
    async (req, res) => {
        try {
            const projects = await Project.findById(req.params.id);
            if (!Category) {
                return validationErrorResponse(res, "Project not found.", 400, projects);
            }
            return successResponse(res, "Project Details successfully.", 201, projects);
        } catch (error) {
            return errorResponse(res, error.message || "Internal Server Error", 500);

        }
    }
);


exports.UpdateProject = CatchAsync(
    async (req, res) => {
        try {
            const { designed, title, brief, solution, content } = req.body;
            const data = await Project.findById(req.params.id);
            if (!data) {
                return validationErrorResponse(res, "Project not found.", 404);
            }
            if (title) data.title = title;
            if (designed) data.designed = designed;
            if (brief) data.brief = brief;
            if (solution) data.solution = solution;
            if (content) data.content = content;

            if (req.file && req.file.location) {

                if (data.Image) {
                    try {
                        await deleteFile(data.Image);
                    } catch (err) {
                        console.log("Error deleting old image:", err.message);
                    }
                }
                data.Image = req.file.location;
            }

            const updatedprojects = await data.save();
            console.log("updatedprojects", updatedprojects)
            return successResponse(res, "PROJECT updated successfully.", 200, updatedprojects);

        } catch (error) {
            console.log(error);
            return errorResponse(res, error.message || "Internal Server Error", 500);
        }
    }
);


exports.ToggleProjectStatus = CatchAsync(
    async (req, res) => {
        try {
            const { id } = req.params;
            const superProject = await Project.findById(id);
            if (!superProject) {
                return validationErrorResponse(res, "Category not found.", 400);
            }
            // Toggle logic
            const newStatus = superProject.status === true ? false : true;
            superProject.status = newStatus;
            await superProject.save();
            return successResponse(
                res,
                `Category ${newStatus === true ? "Blocked" : "Activated"} successfully.`,
                200,
                superProject
            );
        } catch (error) {
            return errorResponse(res, error.message || "Internal Server Error", 500);
        }
    }
);

exports.GetAllProjectStatus = CatchAsync(
    async (req, res) => {
        try {
            const Projects = await Project.find({ status: false });
            return successResponse(res, "Projects list successfully.", 201, Projects);
        } catch (error) {
            return errorResponse(res, error.message || "Internal Server Error", 500);
        }
    }
);