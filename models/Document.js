const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
    {
        title: { type: String, default:"Untitled Document", trim: true},
        content: {type: Object, default: {ops: []} },
        owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        collaborators: [{
            user: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
            permissions: {type: String, enum: ['viewer', 'editor'], default: 'viewer'}
        }],

        version:{
            type: Number,
            default:0,
        },
        history: [{
            content: Object,
            version: Number,
            savedAt: {type: Date, default: Date.now},
            saveBy: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
        }],
        shareToken :{
            type : String,
            default: null,
        },
        isPublic: {
            type: Boolean,
            default: false,
        },
    },
       { timestamps: true}
);


// kiểm tra user có quyền xem hay ko??
documentSchema.methods.canView = function (userId) {
  if (this.isPublic) return true;
  if (this.owner.toString() === userId.toString()) return true;
  return this.collaborators.some(
    (c) => c.user.toString() === userId.toString()
  );
};

//  kiểm tra user có quyền edit ko??
documentSchema.methods.canEdit = function (userId) {
  if (this.owner.toString() === userId.toString()) return true;
  return this.collaborators.some(
    (c) =>
      c.user.toString() === userId.toString() && c.permissions === 'editor'
  );
};

module.exports = mongoose.model('Document', documentSchema);