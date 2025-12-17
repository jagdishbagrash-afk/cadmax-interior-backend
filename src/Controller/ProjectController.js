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
            console.log("projects", projects)
            if (!projects) {
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


exports.ProjectDelete = CatchAsync(async (req, res) => {
    try {
        const id = req.params.id;
        const userrecord = await Project.findById(id);
        console.log("userrecord", userrecord)
        if (!userrecord) {
            return validationErrorResponse(res, "Project not found", 404);
        }
        if (userrecord.deletedAt) {
            userrecord.deletedAt = null;
            await userrecord.save();
            return successResponse(res, "Project restored successfully", 200);
        }

        userrecord.deletedAt = new Date();
        const record = await userrecord.save();
        console.log("record", record)
        return successResponse(res, "Project deleted successfully", 200);

    } catch (error) {
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});