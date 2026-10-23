import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true, default: '' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // owner = ADMIN who created it; manager = PROJECT_MANAGER assigned to run it
  manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

// Helper: check if userId is authorized to access this project
projectSchema.methods.isMember = function (userId) {
  const id = userId.toString();
  return (
    this.owner?.toString() === id ||
    this.manager?.toString() === id ||
    this.members.some(m => m.toString() === id)
  );
};

const Project = mongoose.model('Project', projectSchema);
export default Project;
