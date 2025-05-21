const MeetingHistory = require('../../model/schema/meeting');
const mongoose = require('mongoose');
const User = require('../../model/schema/user');


const add = async (req, res) => {
    try {
        const { agenda, dateTime, location, notes, related, attendes, attendesLead, createBy } = req.body;

        if (!agenda || !dateTime) {
            return res.status(400).json({ success: false, message: "Agenda and Date Time are required fields" });
        }

        const meetingData = {
            agenda,
            dateTime,
            location: location || "",
            notes: notes || "",
            related: related || "Other",
            attendes: related === 'Contact' ? attendes || [] : [],
            attendesLead: related === 'Lead' ? attendesLead || [] : [],
            createBy,
        };

        const newMeeting = new MeetingHistory(meetingData);
        await newMeeting.save();

        res.status(201).json({
            success: true,
            message: "Meeting created successfully",
            data: newMeeting
        });
    } catch (error) {
        console.error("Error creating meeting:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
}

const index = async (req, res) => {
    try {
        const meetings = await MeetingHistory.find({ deleted: false })
            .populate('createBy', 'username email')
            .populate('attendes', 'firstName lastName email')
            .populate('attendesLead', 'leadName email')
            .sort({ timestamp: -1 });

        // Make sure meetings exists and is an array
        if (!meetings) meetings = [];

        res.status(200).json({
            success: true,
            count: meetings.length,
            data: meetings
        });
    } catch (error) {
        console.error("Error fetching meetings:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
}
const view = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid meeting ID format"
            });
        }

        const meeting = await MeetingHistory.findOne({ _id: id, deleted: false })
            .populate('createBy', 'username email')
            .populate('attendes', 'firstName lastName email')
            .populate('attendesLead', 'leadName email');

        if (!meeting) {
            return res.status(404).json({
                success: false,
                message: "Meeting not found"
            });
        }

        // Find the creator's username to add to response
        let createdByName = "Unknown";
        if (meeting.createBy) {
            const user = await User.findById(meeting.createBy);
            if (user) {
                createdByName = user.username || user.email;
            }
        }

        res.status(200).json({
            success: true,
            data: {
                ...meeting.toObject(),
                createdByName
            }
        });
    } catch (error) {
        console.error("Error viewing meeting:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
}

const deleteData = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid meeting ID format"
            });
        }

        // Soft delete by setting deleted flag to true
        const meeting = await MeetingHistory.findByIdAndUpdate(id,
            { deleted: true },
            { new: true }
        );

        if (!meeting) {
            return res.status(404).json({
                success: false,
                message: "Meeting not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Meeting deleted successfully"
        });
    } catch (error) {
        console.error("Error deleting meeting:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
}

const deleteMany = async (req, res) => {
    try {
        // Check if req.body is an array directly
        const idsToDelete = Array.isArray(req.body) ? req.body : req.body.ids;

        console.log("🚀 ~ deleteMany ~ ids to delete:", idsToDelete);

        if (!idsToDelete || !Array.isArray(idsToDelete) || idsToDelete.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Please provide an array of meeting IDs"
            });
        }

        // Validate all IDs
        for (const id of idsToDelete) {
            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid meeting ID format: ${id}`
                });
            }
        }

        // Soft delete multiple meetings
        const result = await MeetingHistory.updateMany(
            { _id: { $in: idsToDelete } },
            { $set: { deleted: true } }
        );

        res.status(200).json({
            success: true,
            message: "Meetings deleted successfully",
            count: result.modifiedCount || result.nModified || 0
        });
    } catch (error) {
        console.error("Error deleting multiple meetings:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};

module.exports = { add, index, view, deleteData, deleteMany };