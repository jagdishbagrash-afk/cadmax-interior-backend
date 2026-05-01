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


        const imageUrls = req.files["images[]"]?.map((f) => f.location) || [];
        const list_image = req.files["Image"]?.[0]?.location || "";

        const slug = await generateUniqueSlug(Project, title);


        const Projects = new Project({
            designed, title, brief, solution, content,
            slug,
            multiple_images: imageUrls,
            Image: list_image,
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
            data.slug = await generateUniqueSlug(Project, title);
        }

        if (designed) data.designed = designed;
        if (brief) data.brief = brief;
        if (solution) data.solution = solution;
        if (content) data.content = content;

        // Get files (if any new ones uploaded)
        const imageUrls = req.files?.["images[]"]?.map((f) => f.location) || [];
        const Image = req.files?.["image"]?.[0]?.location;

        if (Image) data.Image = Image;
        if (imageUrls.length > 0) {
            data.multiple_images = [...data.multiple_images, ...imageUrls];
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
    const { slug } = req.params;

    if (!slug) {
      return validationErrorResponse(res, "Slug is required", 400);
    }

    const project = await Project.findOne({ slug });

    if (!project) {
      return validationErrorResponse(res, "Project not found.", 404);
    }

    return successResponse(
      res,
      "Project details fetched successfully.",
      200,
      project
    );
  } catch (error) {
    return errorResponse(
      res,
      error.message || "Internal Server Error",
      500
    );
  }
});
