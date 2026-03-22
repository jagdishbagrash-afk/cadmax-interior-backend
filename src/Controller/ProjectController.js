const Project = require("../Model/Project");
const User = require("../Model/User");
const CatchAsync = require("../Utill/catchAsync");
const { errorResponse, successResponse, validationErrorResponse } = require("../Utill/ErrorHandling");
const { deleteFile } = require("../Utill/S3");
const sendNotification = require("./sendNotification");


const makeSlug = (text) => {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/[\s\_]+/g, "-")
        .replace(/[^\w\-]+/g, "")
        .replace(/\-\-+/g, "-");
};

const generateUniqueSlug = async (Model, title) => {
    let baseSlug = makeSlug(title);
    let slug = baseSlug;
    let counter = 1;

    while (await Model.findOne({ slug })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
    }

    return slug;
};



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
        const slug = await generateUniqueSlug(Project, title);


        const Projects = new Project({
            designed, title, brief, solution, content,
            Image: imageUrl, slug
        });


        const record = await Projects.save();

        // const users = await User.find({
        //     role: "customer",
        //     status: "active",
        //     deleted_at: null,
        // });

        // await Promise.all(
        //     users.map(user =>
        //         sendNotification({
        //             senderId: req.user.id,
        //             receiverId: user._id,
        //             referenceId: record._id,
        //             referenceType: "project",
        //             text: `New project added: ${record.title}`,
        //         })
        //     )
        // );

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
            if (!projects) {
                return validationErrorResponse(res, "Project not found.", 400, projects);
            }
            return successResponse(res, "Project Details successfully.", 201, projects);
        } catch (error) {
            return errorResponse(res, error.message || "Internal Server Error", 500);

        }
    }
);


exports.UpdateProject = CatchAsync(async (req, res) => {
    try {
        const { designed, title, brief, solution, content } = req.body;

        const data = await Project.findById(req.params.id);

        if (!data) {
            return validationErrorResponse(res, "Project not found.", 404);
        }

        // ✅ Update fields
        if (title) {
            data.title = title;

            // 🔥 slug bhi update karo jab title change ho
            data.slug = await generateUniqueSlug(Project, title);
        }

        if (designed) data.designed = designed;
        if (brief) data.brief = brief;
        if (solution) data.solution = solution;
        if (content) data.content = content;

        // ✅ Image update
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

        return successResponse(
            res,
            "PROJECT updated successfully.",
            200,
            updatedprojects
        );
    } catch (error) {
        console.log(error);
        return errorResponse(
            res,
            error.message || "Internal Server Error",
            500
        );
    }
});


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
        return successResponse(res, "Project deleted successfully", 200);

    } catch (error) {
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});


exports.GetProjectBySlug = CatchAsync(async (req, res) => {
  try {
    const projects = await Project.findOne({ slug: req.params.slug });

    if (!projects) {
      return validationErrorResponse(
        res,
        "Project not found.",
        400
      );
    }

    return successResponse(
      res,
      "Project Details successfully.",
      200,
      projects
    );
  } catch (error) {
    return errorResponse(
      res,
      error.message || "Internal Server Error",
      500
    );
  }
});
