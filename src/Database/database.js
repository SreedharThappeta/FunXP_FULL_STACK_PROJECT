

const mongoose = require("mongoose");

const connectDB = async function () {
    await mongoose.connect(
        "mongodb+srv://sreedhar:sreedhar96@firstcluster.6vi7p.mongodb.net/Funxp?retryWrites=true&w=majority&appName=FirstCluster"
    );
};

console.log("DB connection Started!");
module.exports = {connectDB};

