const Document = require('../models/Document');
const User= require('../models/User');
const crypto = require('crypto');

// get all documents of user ( owner + collaborator)
const getAllDocuments = async (req, res) => {
    try {
        const documents = await Document.find({
            $or: [
                {owner: req.user.id},
                {'collaborators.user': req.user.id}
            ],
        })
        .select('title owner collaborators updateAt version')
        .populate('owner', ' name email')
        .sort({updatedAt: -1});

        res.json(documents);
    }catch (err) {
        console.error('Error in getDocuments:', err);
        res.status(500).json({message: 'Server error'});
    }
};

// get 1 doc
const getDocument = async (req, res ) => {
    try {
        const document = await Document.findById(req.params.id)
        .populate('owner', 'name email')            
        .populate('collaborators.user', 'name email');


        if (!document ){
            return res.status(404).json({message: 'Document not found'});
        }

        // kiểm tra quyền xem
        if(!document.canView(req.user.id)){
            return res.status(403).json({message: "Access denied"});
        }

        res.json(document);
    }catch (err) {
        console.error('Error in getDocument:', err);
        res.status(500).json({message: 'Server error'});
    }
};

// creat new doc
const createDocument = async (req, res ) => {
    try{
        
        const { title} = req.body;
        const document = await Document.create({
            title: title || 'Untitled Document',
            owner: req.user.id,
            content: {ops: []},
        })

        await document.populate('owner', 'name email');
        res.status(201).json(document);

    }catch(err ){
        console.error('Error in createDocument:', err);
        res.status(500).json({message: 'Server error'});
    }
};

// update doc
const updateDocument= async(req, res) =>{
    try {

        const document = await Document.findById(req.params.id);

        if(!document ){
            return res.status(404).json({message:" Document not found "});
        }

        if( !document.canEdit(req.user.id)){
            return res.status(403).json({message: "Access denied ( You do not have permission to edit this document )"});
        }   

        const { title, content} = req.body;

        if ( content  && document.content ){
            document.history.push({
                content: document.content,
                version: document.version,
                savedAt: new Date(),
                saveBy: req.user.id,
            });

            if ( document.history.length > 50){
                document.history.shift();
            }

            document.version += 1;

        }
        
        if ( title !== undefined ) document.title = title;
        if ( content !== undefined) document.content = content;

        const updated = await document.save();

        res.json(updated);

    }catch (err){
        console.error('Error in updateDocument: ', err);
        res.status(500).json({message: 'Server Error'});
    }
};

const deleteDocument = async(req, res) => {
    try {
        const document = await Document.findById(req.params.id)
        .populate('owner', 'name email');
        
        if(!document){
            return res.status(404).json({message: "Document not Found "})
        }

        if(document.owner._id.toString() !== req.user.id ){
            return res.status(403).json({message: `You can't delete this doc (${document.owner.email} can)`});
        }

        await Document.findByIdAndDelete(req.params.id);

        res.json({ message:" Delete document id: "+req.params.id })



    } catch (error) {
        console.error('Error in deleteDocument: '+error); 
        res.status(500).json({message: "Sever Error"}) 
    }
};
// add collaborator (default: viewer )
const addColaborator = async( req, res) => {
    
    try {        
        const document = await Document.findById(req.params.id);
            
        if(!document){
            return res.status(404).json({message: "Document not Found "})
        } 

        if( document.owner.toString() !== req.user.id){
            return res.status(403).json({ message :"Only owner can add collaborator"})
        }

        const { email, permission } = req.body;

        if (!email){
            return res.status(403).json({ message :"Missing email !!"})
        }

        const userToAdd = await User.findOne({email});

        if (!userToAdd){
            return res.status(403).json({ message :"User not found with this email !!"})
        }

        if( userToAdd._id.toString() === req.user.id){
            return res.status(403).json({ message :"You already owner"})
        }

        const alreadyCollaborator = document.collaborators.some(
        (c) => c.user.toString() === userToAdd._id.toString()
        );

        if (alreadyCollaborator){
            return res.status(403).json({ message: "User is already a collaborator"})
        }
        document.collaborators.push({
            user: userToAdd._id,
            permission: permission || 'viewer',
        });

        await document.save();
        await document.populate('collaborators.user', 'name email');

        res.json(document.collaborators);

    } catch (error) {
        console.error('Error in addCollaborator: '+error);
        res.status(500).json({message: "Sever Error"})
    }        
};


const getHistory = async(req, res) => {
    try {
        const document = await Document.findById(req.params.id)
        .populate('history.saveBy', 'name email');

        if(!document){
            return res.status(404).json({message: "Document not Found"})
        }

        if(!document.canView(req.user.id)){
            return res.status(403).json({message: "You do not have permission to view this document"})
        }

        const history = [...document.history].reverse().map((h => ({
            version: h.version,
            savedAt: h.savedAt,
            saveBy: h.saveBy,
        })));        


        res.json(history);
    }catch (err) {
        console.error('Error in getHistory: '+err);
        res.status(500).json({message: "Sever Error"})
    }
};


const generateShareLink = async(req, res) => {
    try {
        
        const document = await Document.findById(req.params.id)
    
        if(!document){
            return res.status(404).json({message: "Document not Found"})
        }   

        if ( document.collaborators.permissions !=='editor' && document.owner.toString() !== req.user.id){
            return res.status(403).json({
                message:"You do not have permission to generate share link for this doc"
            })
        }

        if(!document.shareToken){
            document.shareToken = crypto.randomBytes(16).toString('hex');
        }

        document.isPublic = true;

        await document.save();
    } catch (err) {
        console.error("Error in generateShareLink:"+ err);
        res.status(500).json({message :"Server Error"})
    }
}


module.exports = {
    generateShareLink,
    addColaborator,
    getHistory,
    getAllDocuments,
    getDocument,
    createDocument,
    updateDocument,
    deleteDocument, 
}
