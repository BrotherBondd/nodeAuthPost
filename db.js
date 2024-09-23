import mongoose from "mongoose";


// export default async function connectMongoDB() {
//     try {
//         await mongoose.connect(process.env.MONGO_DB_URI);
//         console.log("Connected to MongoDB");
//     } catch (error) {
//         console.log(error);
//     }
// }


export default async function connectMongoDB() {
    try {
        await mongoose.connect(process.env.MONGO_DB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log("Connected to MongoDB");
    } catch (error) {
        console.error("Error connecting to MongoDB:", error.message);
        process.exit(1); // Exit the process if unable to connect
    }
}