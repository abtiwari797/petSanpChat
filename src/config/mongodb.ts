    // src/config/mongodb.ts
    import mongoose from 'mongoose';

    export const connectMongoDB = async () => {
      try {
        await mongoose.connect('mongodb+srv://admin:Adarsh1996@cluster0.hlsu4wx.mongodb.net/');
        console.log('MongoDB connected successfully!');
      } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
      }
    };

 