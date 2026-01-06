const mongoose = require('mongoose');
const { Candidate, Application, JobOpening } = require('../models');

async function createDummyApplications() {
  require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
  await mongoose.connect(process.env.MONGODB_URI);

  // Get any job
  let job = await JobOpening.findOne();
  console.log('Job found:', job ? job.title : 'Not found');

  if (!job) {
    console.log('No job found - creating a dummy job first');
    job = await JobOpening.create({
      title: 'AI Engineer',
      location: 'Hyderabad',
      is_active: true
    });
    console.log('Created job:', job.title);
  }

  // Create dummy candidates
  const candidates = [
    { name: 'Sarah Johnson', email: 'sarah.johnson@example.com', phone: '+1-555-0101', location: 'San Francisco, CA', linkedin_url: 'https://linkedin.com/in/sarahjohnson' },
    { name: 'Michael Chen', email: 'michael.chen@example.com', phone: '+1-555-0102', location: 'New York, NY', linkedin_url: 'https://linkedin.com/in/michaelchen' },
    { name: 'Emily Rodriguez', email: 'emily.rodriguez@example.com', phone: '+1-555-0103', location: 'Austin, TX', linkedin_url: 'https://linkedin.com/in/emilyrodriguez' },
    { name: 'David Kim', email: 'david.kim@example.com', phone: '+1-555-0104', location: 'Seattle, WA', linkedin_url: 'https://linkedin.com/in/davidkim' },
    { name: 'Jessica Patel', email: 'jessica.patel@example.com', phone: '+1-555-0105', location: 'Boston, MA', linkedin_url: 'https://linkedin.com/in/jessicapatel' }
  ];

  const createdApplications = [];

  for (const candidateData of candidates) {
    // Create or find candidate
    let candidate = await Candidate.findOne({ email: candidateData.email });
    if (!candidate) {
      candidate = await Candidate.create({
        ...candidateData,
        company_id: job.company_id
      });
      console.log('Created candidate:', candidate.name);
    } else {
      console.log('Candidate exists:', candidate.name);
    }

    // Check if application exists
    let application = await Application.findOne({ job_id: job._id, candidate_id: candidate._id });
    if (!application) {
      application = await Application.create({
        company_id: job.company_id,
        job_id: job._id,
        candidate_id: candidate._id,
        stage: 'screening',
        status: 'under_review',
        ai_score: Math.floor(Math.random() * 30) + 70, // 70-99
        profile_strength: ['Strong', 'Good', 'Excellent'][Math.floor(Math.random() * 3)],
        applied_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Last 7 days
        stage_history: [{
          stage: 'screening',
          entered_at: new Date(),
          action: 'stage_change',
          notes: 'Moved to screening for review'
        }]
      });
      console.log('Created application for:', candidate.name, '- Stage:', application.stage);
      createdApplications.push({ candidate: candidate.name, applicationId: application._id.toString() });
    } else {
      console.log('Application exists for:', candidate.name);
    }
  }

  console.log('\n✅ Created', createdApplications.length, 'new applications at screening stage');
  if (createdApplications.length > 0) {
    console.log('Applications:', JSON.stringify(createdApplications, null, 2));
  }

  await mongoose.disconnect();
}

createDummyApplications().catch(console.error);
