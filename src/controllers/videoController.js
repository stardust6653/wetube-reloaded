import Video from "../models/Video"
import Comment from "../models/Comment"
import User from "../models/User"

//callback함수로 작성
/*
  Video.find({}, (error, videos) => {
    if(error){
      return res.render("server-error")
    }
    return res.render("home", {pageTitle: "Home",})
  })
*/


//promise 로 작성
export const home = async (req, res) => {
    const videos = await Video.find({})
    .sort({ createdAt: "desc" })
    .populate("owner");
  return res.render("home", { pageTitle: "Home", videos });
  };

  //중괄호 {} 는 search term으로 비어있으면 모든 형식을 찾음을 의미
  //await 기능이 없는 콜백함수와는 달리 promise 는 await 기능이 있어 database에서 결과값을 받기까지 대기하고 있을 수 있다.
export const watch = async (req, res) => {
  const { id } = req.params
  const video = await Video.findById(id).populate("owner").populate("comments");
  if(!video){
    return res.render("404", {pageTitle: "Video not found."})
  }
    return res.render("watch", { pageTitle : video.title, video })
}
export const getEdit = async (req, res) => {
  const { id } = req.params
  const { user: {_id}} = req.session
  const video = await Video.findById(id)
  if(!video){
    return res.status(404).render("404", {pageTitle: "Video not found."})
  }
  if(String(video.owner) !== String(_id)){
    req.flash("error", "Your are not the owner of the video.")
    return res.status(403).redirect("/")
  }
  return res.render("edit", {pageTitle : `Edit : ${video.title}`, video})
}
export const postEdit = async (req, res) => {
  const { id } = req.params
  const { title, description, hashtags } = req.body
  const video = await Video.exists({_id: id})
  if(!video){
    return res.status(404).render("404", {pageTitle: "Video not found."})
  }
  await Video.findByIdAndUpdate(id, {
    title,
    description,
    hashtags: Video.formatHashtags(hashtags)
  })
  req.flash("success", "Changes saved.")
  return res.redirect(`/videos/${id}`)
}

export const getUpload = (req, res) => {
  return res.render("upload", {pageTitle : "Upload Video"})
}

/*
export const postUpload = async (req, res) => {
  const { title, description, hashtags } = req.body
  const video = new Video({
    title,
    description,
    createAt : Date.now(),
    hashtags: hashtags.split(",").map((word) => `#${word}`),
    meta: {
      views: 0,
      rating: 0,
    },
  })
  const dbVideo = await video.save()
  return res.redirect("/")
}
*/

export const postUpload = async (req, res) => {
  const {
    user: { _id } 
  } = req.session
  const { path:fileUrl } = req.file
  const { title, description, hashtags } = req.body
  try{
    const newVideo = await Video.create({
      title,
      description,
      fileUrl,
      owner: _id,
      hashtags: Video.formatHashtags(hashtags)
    })
    const user = await User.findById(_id)
    user.videos.push(newVideo._id)
    user.save()
    return res.redirect("/")
  } catch(error){
      console.log(error)
      return res.status(400).render("upload", {pageTitle : "Upload Video", errorMessage: error._message})
  }
}

export const deleteVideo = async (req, res) => {
  const { id } = req.params
  const {
    user : { _id }
  } = req.session
  const video = await Video.findById(id)
  if(!video){
    return res.status(404).render("404", {pageTitle: "Video not found."})
  }
  if(String(video.owner) !== String(_id)){
    return res.status(403).redirect("/")
  }
  await Video.findByIdAndDelete(id)  
  return res.redirect("/")
}

export const search = async (req, res) => {
  const { keyword } = req.query
  let videos = []
  if(keyword){
    videos = await Video.find({
      title: {
        $regex: new RegExp(keyword, "i")
      },
    })
  }
  return res.render("search", {pageTitle: "Search", videos})  
}

export const registerView = async (req, res) => {
  const { id } = req.params;
  const video = await Video.findById(id);
  if (!video) {
    return res.sendStatus(404);
  }
  video.meta.views = video.meta.views + 1;
  await video.save();
  return res.sendStatus(200);
};

export const createComment = async (req, res) => {
  const {
    session: { user },
    body : { text },
    params : { id }
  } = req;
  const video = await Video.findById(id);
  if(!video){
    return res.sendStatus(404);
  };
  const comment = await Comment.create({
    text,
    owner: user._id,
    video: id,
  });
  video.comments.push(comment._id);
  video.save();
  return res.sendStatus(201);
}