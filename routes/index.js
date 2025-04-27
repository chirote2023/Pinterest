var express = require("express");
var router = express.Router();
const userModel = require("./users");
const postModel = require("./post");
const passport = require("passport");
const localStrategy = require("passport-local");
const upload = require("./multer");

passport.use(new localStrategy(userModel.authenticate()));

router.get("/", function (req, res, next) {
  res.render("index", { nav: false });
});

router.get("/change-password", isLoggedIn, async function (req, res, next) {
  const user = await userModel
    .findOne({ username: req.session.passport.user })
    .populate("posts");
  res.render("change-password", { nav: false });
});

router.post("/change-password", isLoggedIn, async (req, res) => {
  const user = await userModel.findOne({ username: req.session.passport.user });

  if (!user) {
    return res.render("change-password", {
      error: "User not found",
      nav: false,
    });
  }

  const { oldPassword, newPassword, confirmPassword } = req.body;

  if (newPassword !== confirmPassword) {
    return res.render("change-password", {
      error: "New passwords do not match",
      nav: false,
    });
  }

  user
    .changePassword(oldPassword, newPassword)
    .then(() => res.redirect("/profile"))
    .catch((error) => {
      console.error(error);
      res.render("change-password", {
        error: "Error changing password",
        nav: false,
      });
    });
});

router.get("/editpost/:cardId", isLoggedIn, async function (req, res, next) {
  const user = await userModel
    .findOne({ username: req.session.passport.user })
    .populate("posts");
  const post = await postModel
    .findOne({
      _id: req.params.cardId,
    })
    .populate("user");
  res.render("edituserpost", { nav: true, user, post });
});

router.post(
  "/changepostdetail/:cardId",
  isLoggedIn,
  async function (req, res, next) {
    const user = await userModel
      .findOne({ username: req.session.passport.user })
      .populate("posts");
    const post = await postModel.findOneAndUpdate(
      { _id: req.params.cardId },
      { title: req.body.title, description: req.body.description },
      { new: true }
    );
    res.redirect("back");
  }
);

router.get("/edit", isLoggedIn, async function (req, res, next) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  res.render("edit", { nav: false, user });
});

router.post("/changedetail", isLoggedIn, async function (req, res) {
  const user = await userModel.findOneAndUpdate(
    { username: req.session.passport.user },
    { username: req.body.username, name: req.body.name },
    { new: true }
  );
  req.login(user, function (err) {
    if (err) throw err;
    res.redirect("profile");
  });
});

router.get("/register", function (req, res, next) {
  res.render("register", { nav: false });
});

router.get("/profile", isLoggedIn, async function (req, res, next) {
  const user = await userModel
    .findOne({ username: req.session.passport.user })
    .populate("posts");
  res.render("profile", { user, nav: true });
});

router.get("/show/posts", isLoggedIn, async function (req, res, next) {
  const user = await userModel
    .findOne({ username: req.session.passport.user })
    .populate("posts");
  res.render("show", { user, nav: true });
});

router.get("/show/post/:cardId", isLoggedIn, async function (req, res, next) {
  const user = await userModel
    .findOne({ username: req.session.passport.user })
    .populate("posts");
  const post = await postModel
    .findOne({
      _id: req.params.cardId,
    })
    .populate("user");
  res.render("image", { user, post, nav: true });
});

router.get("/feed", isLoggedIn, async function (req, res, next) {
  const user = await userModel
    .findOne({ username: req.session.passport.user })
    .populate("posts");
  const posts = await postModel.find().populate("user");
  res.render("feed", { user, posts, nav: true });
});

router.get("/add", isLoggedIn, async function (req, res, next) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  res.render("add", { user, nav: true });
});

router.post(
  "/createpost",
  isLoggedIn,
  upload.single("post-image"),
  async function (req, res, next) {
    const user = await userModel.findOne({
      username: req.session.passport.user,
    });
    const post = await postModel.create({
      user: user._id,
      title: req.body.title,
      description: req.body.description,
      image: req.file.filename,
    });
    user.posts.push(post._id);
    await user.save();
    res.redirect("/profile");
  }
);

router.post(
  "/fileupload",
  upload.single("image"),
  isLoggedIn,
  async function (req, res, next) {
    const user = await userModel.findOne({
      username: req.session.passport.user,
    });
    user.profileImage = req.file.filename;
    await user.save();
    res.redirect("/profile");
  }
);

// router.get("/delete/:cardid", async function (req, res, next) {
//   const user = await userModel.findOne({ username: req.session.passport.user });
//   const deletepost = await postModel.findOneAndDelete({
//     _id: req.params.cardid,
//   });
//   res.redirect("/show/posts");
// });
router.get("/delete/:cardid", isLoggedIn, async function (req, res, next) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  const deletepost = await postModel.findByIdAndDelete({
    _id: req.params.cardid,
  });
  res.redirect("/show/posts");
});

router.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/profile",
    failureRedirect: "/",
  }),
  function (req, res) {}
);

router.get("/logout", function (req, res, next) {
  req.logout(function(err){
    if(err) { return next(err); }
    res.redirect('/')
  })
});

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/");
}

router.post("/register", function (req, res) {
  const data = new userModel({
    username: req.body.username,
    email: req.body.email,
    contact: req.body.contact,
    name: req.body.fullname,
  });

  userModel.register(data, req.body.password).then(function (registereduser) {
    passport.authenticate("local")(req, res, function () {
      res.redirect("/profile");
    });
  });
});

module.exports = router;
