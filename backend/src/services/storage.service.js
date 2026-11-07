import ImageKit from "@imagekit/nodejs";
import config from "../config/config.js"
const ImageKitClient = new ImageKit({
    privateKey: config.IMAGE_KIT_PRIVATE_KEY
})
export async function uploadBook(files){
    const result = await ImageKitClient.files.upload({
        files,
        fileName: "Books" + Date.now(),
        folder: "Book-z/books"
    })
    return result;
}