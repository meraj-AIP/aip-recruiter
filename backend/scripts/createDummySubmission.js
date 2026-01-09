const mongoose = require('mongoose');
require('dotenv').config();

async function createDummySubmission() {
  await mongoose.connect(process.env.MONGODB_URI);

  const { CandidateAssignment, Application, Candidate, AssignmentTemplate } = require('../models');

  // Find an application with assignment-sent stage
  let app = await Application.findOne({ stage: 'assignment-sent' });

  if (!app) {
    console.log('No application found with assignment-sent stage');
    // List all applications with their stages
    const allApps = await Application.find().select('stage candidate_id');
    console.log('All applications by stage:');
    const stageCount = {};
    allApps.forEach(a => {
      stageCount[a.stage] = (stageCount[a.stage] || 0) + 1;
    });
    console.log(stageCount);

    // Pick any application that's not rejected/hired
    app = await Application.findOne({
      stage: { $nin: ['rejected', 'hired', 'assignment-submitted'] }
    });

    if (!app) {
      console.log('No suitable application found');
      await mongoose.disconnect();
      return;
    }
    console.log('Using application in stage:', app.stage);
  }

  const candidate = await Candidate.findById(app.candidate_id);
  const { JobOpening } = require('../models');
  const job = await JobOpening.findById(app.job_id);
  console.log('Found application:', candidate?.name, 'for job:', job?.title);

  // Check if there's already a candidate assignment for this application
  let assignment = await CandidateAssignment.findOne({ application_id: app._id });

  if (assignment) {
    // Update existing assignment to submitted status with dummy submission
    assignment.status = 'submitted';
    assignment.submission_links = ['https://github.com/test-user/assignment-repo', 'https://drive.google.com/file/example'];
    assignment.submission_notes = 'I have completed the assignment. The GitHub repo contains the full implementation with tests. I also attached a video walkthrough in the Google Drive link.';
    assignment.submission_files = [];
    assignment.submitted_at = new Date();
    await assignment.save();
    console.log('Updated existing assignment to submitted status');
  } else {
    console.log('No candidate assignment found, creating one...');
    // Find an assignment template
    const template = await AssignmentTemplate.findOne();

    if (template) {
      assignment = await CandidateAssignment.create({
        application_id: app._id,
        assignment_id: template._id,
        assignment_name: template.name,
        instructions: template.instructions,
        deadline_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'submitted',
        submission_links: ['https://github.com/test-user/assignment-repo', 'https://drive.google.com/file/example'],
        submission_notes: 'I have completed the assignment. The GitHub repo contains the full implementation with tests.',
        submitted_at: new Date(),
        sent_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      });
      console.log('Created new assignment with submitted status');
    } else {
      console.log('No assignment template found');
    }
  }

  // Also update the application stage to assignment-submitted
  app.stage = 'assignment-submitted';
  await app.save();
  console.log('Updated application stage to assignment-submitted');

  console.log('Done! Assignment ID:', assignment?._id);
  console.log('Candidate:', candidate?.name);

  await mongoose.disconnect();
}

createDummySubmission().catch(console.error);
