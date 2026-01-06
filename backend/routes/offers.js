// =====================================================
// OFFERS ROUTES - MongoDB
// Job offers sent to candidates
// =====================================================

const express = require('express');
const router = express.Router();
const { Offer, Application, ActivityLog } = require('../models');
const emailService = require('../services/emailService');

// =====================================================
// GET /api/offers - Get all offers
// =====================================================
router.get('/', async (req, res) => {
  try {
    const { applicationId, candidateId, status, companyId } = req.query;

    const filter = {};
    if (applicationId) filter.application_id = applicationId;
    if (candidateId) filter.candidate_id = candidateId;
    if (status) filter.status = status;
    if (companyId) filter.company_id = companyId;

    const offers = await Offer.find(filter)
      .populate('application_id')
      .populate('candidate_id')
      .populate('job_id')
      .sort({ createdAt: -1 })
      .lean();

    const data = offers.map(offer => ({
      id: offer._id,
      applicationId: offer.application_id?._id,
      candidateId: offer.candidate_id?._id,
      jobId: offer.job_id?._id,
      candidateName: offer.candidate_name,
      candidateEmail: offer.candidate_email,
      jobTitle: offer.job_title,
      department: offer.department,
      location: offer.location,
      offerType: offer.offer_type,
      offerContent: offer.offer_content,
      offerFile: offer.offer_file,
      salary: offer.salary,
      salaryCurrency: offer.salary_currency,
      bonus: offer.bonus,
      equity: offer.equity,
      benefits: offer.benefits,
      startDate: offer.start_date,
      expiryDate: offer.expiry_date,
      status: offer.status,
      sentAt: offer.sent_at,
      sentBy: offer.sent_by,
      responseDate: offer.response_date,
      responseNotes: offer.response_notes,
      negotiationHistory: offer.negotiation_history,
      internalNotes: offer.internal_notes,
      termsAndConditions: offer.terms_and_conditions,
      createdAt: offer.createdAt,
      updatedAt: offer.updatedAt,
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching offers:', error);
    res.status(500).json({ error: 'Failed to fetch offers' });
  }
});

// =====================================================
// GET /api/offers/respond-script.js - Serve JavaScript for offer response page
// =====================================================
router.get('/respond-script.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.send(`
(function() {
  var offerId = document.body.getAttribute('data-offer-id');

  function showAcceptModal() {
    document.getElementById('acceptModal').classList.add('active');
  }

  function showRejectModal() {
    document.getElementById('rejectModal').classList.add('active');
  }

  function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
  }

  function toggleOtherReason() {
    var select = document.getElementById('rejectReason');
    var otherGroup = document.getElementById('otherReasonGroup');
    var otherInput = document.getElementById('otherReasonInput');

    if (select.value === 'other') {
      otherGroup.style.display = 'block';
      otherInput.required = true;
    } else {
      otherGroup.style.display = 'none';
      otherInput.required = false;
    }
  }

  function submitAccept(e) {
    e.preventDefault();
    var form = document.getElementById('acceptForm');
    var data = {
      preferredStartDate: form.preferredStartDate.value,
      contactNumber: form.contactNumber.value,
      currentLocation: form.currentLocation.value,
      permanentAddress: form.permanentAddress.value,
      emergencyContact: form.emergencyContact.value,
      additionalNotes: form.additionalNotes.value
    };

    fetch('/api/offers/respond/' + offerId + '/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    .then(function(response) { return response.json(); })
    .then(function(result) {
      if (result.success) {
        closeModal('acceptModal');
        showSuccess('Offer Accepted!', 'Congratulations! We are excited to have you join our team. The HR team will contact you shortly with next steps.', true);
      } else {
        alert(result.error || 'Failed to accept offer');
      }
    })
    .catch(function(error) {
      alert('An error occurred. Please try again.');
    });
  }

  function submitReject(e) {
    e.preventDefault();
    var form = document.getElementById('rejectForm');
    var data = {
      reason: form.reason.value,
      otherReason: form.otherReason ? form.otherReason.value : '',
      feedback: form.feedback.value
    };

    fetch('/api/offers/respond/' + offerId + '/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    .then(function(response) { return response.json(); })
    .then(function(result) {
      if (result.success) {
        closeModal('rejectModal');
        showSuccess('Response Recorded', 'Thank you for considering AI Planet. We wish you all the best in your future endeavors.', false);
      } else {
        alert(result.error || 'Failed to record response');
      }
    })
    .catch(function(error) {
      alert('An error occurred. Please try again.');
    });
  }

  function showSuccess(title, message, isAccept) {
    document.getElementById('successIcon').textContent = isAccept ? '🎉' : '👋';
    document.getElementById('successTitle').textContent = title;
    document.getElementById('successMessage').textContent = message;
    document.getElementById('successModal').classList.add('active');

    document.getElementById('acceptBtn').disabled = true;
    document.getElementById('rejectBtn').disabled = true;
    document.getElementById('acceptBtn').style.opacity = '0.5';
    document.getElementById('rejectBtn').style.opacity = '0.5';
  }

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    // Button click handlers
    document.getElementById('acceptBtn').addEventListener('click', showAcceptModal);
    document.getElementById('rejectBtn').addEventListener('click', showRejectModal);
    document.getElementById('cancelAcceptBtn').addEventListener('click', function() { closeModal('acceptModal'); });
    document.getElementById('cancelRejectBtn').addEventListener('click', function() { closeModal('rejectModal'); });

    // Form submit handlers
    document.getElementById('acceptForm').addEventListener('submit', submitAccept);
    document.getElementById('rejectForm').addEventListener('submit', submitReject);

    // Reason dropdown change handler
    document.getElementById('rejectReason').addEventListener('change', toggleOtherReason);

    // Close modal when clicking outside
    var modals = document.querySelectorAll('.modal');
    for (var i = 0; i < modals.length; i++) {
      modals[i].addEventListener('click', function(e) {
        if (e.target === this) {
          this.classList.remove('active');
        }
      });
    }
  }
})();
  `);
});

// =====================================================
// GET /api/offers/respond/:id - Show offer response page (for candidates)
// NOTE: This route MUST come before /:id to avoid being caught by the :id param
// =====================================================
router.get('/respond/:id', async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id).lean();

    if (!offer) {
      return res.send(generateErrorPage('Offer Not Found', 'The offer you are looking for does not exist or has been removed.'));
    }

    if (offer.status === 'accepted') {
      return res.send(generateSuccessPage('Offer Already Accepted', 'You have already accepted this offer. We look forward to having you on our team!', offer));
    }

    if (offer.status === 'rejected') {
      return res.send(generateErrorPage('Offer Already Declined', 'You have already declined this offer. If you have changed your mind, please contact us.'));
    }

    if (offer.status === 'expired') {
      return res.send(generateErrorPage('Offer Expired', 'This offer has expired. Please contact us if you are still interested in the position.'));
    }

    if (offer.status === 'withdrawn') {
      return res.send(generateErrorPage('Offer Withdrawn', 'This offer has been withdrawn. Please contact us for more information.'));
    }

    // Show the response page
    res.send(generateOfferResponsePage(offer));
  } catch (error) {
    console.error('Error showing offer response page:', error);
    res.send(generateErrorPage('Error', 'An error occurred while loading the offer. Please try again later.'));
  }
});

// =====================================================
// POST /api/offers/respond/:id/accept - Accept offer (from candidate)
// NOTE: This route MUST come before /:id to avoid being caught by the :id param
// =====================================================
router.post('/respond/:id/accept', async (req, res) => {
  try {
    const { preferredStartDate, currentLocation, permanentAddress, contactNumber, emergencyContact, additionalNotes } = req.body;

    const offer = await Offer.findById(req.params.id);

    if (!offer) {
      return res.status(404).json({ error: 'Offer not found' });
    }

    if (offer.status !== 'sent' && offer.status !== 'viewed') {
      return res.status(400).json({ error: 'This offer cannot be accepted in its current state' });
    }

    // Update offer status
    offer.status = 'accepted';
    offer.response_date = new Date();
    offer.response_notes = JSON.stringify({
      action: 'accepted',
      preferredStartDate,
      currentLocation,
      permanentAddress,
      contactNumber,
      emergencyContact,
      additionalNotes,
      acceptedAt: new Date()
    });

    // Add to negotiation history
    offer.negotiation_history.push({
      date: new Date(),
      action: 'accepted',
      details: `Offer accepted. Preferred start date: ${preferredStartDate || 'As per offer'}`,
      by: offer.candidate_name
    });

    await offer.save();

    // Update application stage
    await Application.findByIdAndUpdate(offer.application_id, {
      stage: 'offer-accepted',
      status: 'hired',
      last_activity_at: new Date(),
      updatedAt: new Date(),
      $push: {
        stage_history: {
          stage: 'offer-accepted',
          entered_at: new Date(),
          action: 'offer_accepted',
          moved_by: offer.candidate_name,
          notes: `Candidate accepted the offer. Start date: ${preferredStartDate || 'As per offer'}`
        }
      }
    });

    // Log activity
    await new ActivityLog({
      application_id: offer.application_id,
      company_id: offer.company_id,
      action: 'offer_accepted',
      description: `${offer.candidate_name} accepted the offer for ${offer.job_title}`,
      metadata: {
        offerId: offer._id,
        preferredStartDate,
        currentLocation,
        contactNumber
      }
    }).save();

    console.log(`✅ Offer accepted by candidate:`, offer._id);

    // Send acceptance confirmation email to candidate
    try {
      await emailService.sendOfferAcceptanceConfirmation({
        candidateName: offer.candidate_name,
        candidateEmail: offer.candidate_email,
        jobTitle: offer.job_title,
        startDate: preferredStartDate || offer.start_date
      });
    } catch (emailError) {
      console.error('Failed to send acceptance confirmation email:', emailError);
    }

    res.json({ success: true, message: 'Offer accepted successfully' });
  } catch (error) {
    console.error('Error accepting offer:', error);
    res.status(500).json({ error: 'Failed to accept offer' });
  }
});

// =====================================================
// POST /api/offers/respond/:id/reject - Reject offer (from candidate)
// NOTE: This route MUST come before /:id to avoid being caught by the :id param
// =====================================================
router.post('/respond/:id/reject', async (req, res) => {
  try {
    const { reason, otherReason, feedback } = req.body;

    const offer = await Offer.findById(req.params.id);

    if (!offer) {
      return res.status(404).json({ error: 'Offer not found' });
    }

    if (offer.status !== 'sent' && offer.status !== 'viewed') {
      return res.status(400).json({ error: 'This offer cannot be rejected in its current state' });
    }

    const rejectionReason = reason === 'other' ? otherReason : reason;

    // Update offer status
    offer.status = 'rejected';
    offer.response_date = new Date();
    offer.response_notes = JSON.stringify({
      action: 'rejected',
      reason: rejectionReason,
      feedback,
      rejectedAt: new Date()
    });

    // Add to negotiation history
    offer.negotiation_history.push({
      date: new Date(),
      action: 'rejected',
      details: `Offer rejected. Reason: ${rejectionReason}${feedback ? `. Feedback: ${feedback}` : ''}`,
      by: offer.candidate_name
    });

    await offer.save();

    // Update application
    await Application.findByIdAndUpdate(offer.application_id, {
      last_activity_at: new Date(),
      updatedAt: new Date(),
      $push: {
        stage_history: {
          stage: 'offer-sent',
          action: 'offer_rejected',
          moved_by: offer.candidate_name,
          notes: `Candidate rejected the offer. Reason: ${rejectionReason}`
        }
      }
    });

    // Log activity
    await new ActivityLog({
      application_id: offer.application_id,
      company_id: offer.company_id,
      action: 'offer_rejected',
      description: `${offer.candidate_name} rejected the offer for ${offer.job_title}`,
      metadata: {
        offerId: offer._id,
        reason: rejectionReason,
        feedback
      }
    }).save();

    console.log(`❌ Offer rejected by candidate:`, offer._id);

    res.json({ success: true, message: 'Response recorded successfully' });
  } catch (error) {
    console.error('Error rejecting offer:', error);
    res.status(500).json({ error: 'Failed to record response' });
  }
});

// =====================================================
// GET /api/offers/by-application/:applicationId - Get offers for specific application
// NOTE: This route MUST come before /:id to avoid being caught by the :id param
// =====================================================
router.get('/by-application/:applicationId', async (req, res) => {
  try {
    const offers = await Offer.find({
      application_id: req.params.applicationId
    })
      .sort({ createdAt: -1 })
      .lean();

    const data = offers.map(offer => ({
      id: offer._id,
      candidateName: offer.candidate_name,
      candidateEmail: offer.candidate_email,
      jobTitle: offer.job_title,
      offerType: offer.offer_type,
      offerContent: offer.offer_content,
      offerFile: offer.offer_file,
      salary: offer.salary,
      salaryCurrency: offer.salary_currency,
      bonus: offer.bonus,
      benefits: offer.benefits,
      startDate: offer.start_date,
      expiryDate: offer.expiry_date,
      status: offer.status,
      sentAt: offer.sent_at,
      sentBy: offer.sent_by,
      responseDate: offer.response_date,
      responseNotes: offer.response_notes,
      createdAt: offer.createdAt,
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching offers for application:', error);
    res.status(500).json({ error: 'Failed to fetch offers' });
  }
});

// =====================================================
// GET /api/offers/:id - Get single offer
// =====================================================
router.get('/:id', async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id)
      .populate('application_id')
      .populate('candidate_id')
      .populate('job_id')
      .lean();

    if (!offer) {
      return res.status(404).json({ error: 'Offer not found' });
    }

    res.json({
      success: true,
      data: {
        id: offer._id,
        applicationId: offer.application_id?._id,
        candidateId: offer.candidate_id?._id,
        jobId: offer.job_id?._id,
        candidateName: offer.candidate_name,
        candidateEmail: offer.candidate_email,
        jobTitle: offer.job_title,
        department: offer.department,
        location: offer.location,
        offerType: offer.offer_type,
        offerContent: offer.offer_content,
        offerFile: offer.offer_file,
        salary: offer.salary,
        salaryCurrency: offer.salary_currency,
        bonus: offer.bonus,
        equity: offer.equity,
        benefits: offer.benefits,
        startDate: offer.start_date,
        expiryDate: offer.expiry_date,
        status: offer.status,
        sentAt: offer.sent_at,
        sentBy: offer.sent_by,
        responseDate: offer.response_date,
        responseNotes: offer.response_notes,
        negotiationHistory: offer.negotiation_history,
        internalNotes: offer.internal_notes,
        termsAndConditions: offer.terms_and_conditions,
        createdAt: offer.createdAt,
      }
    });
  } catch (error) {
    console.error('Error fetching offer:', error);
    res.status(500).json({ error: 'Failed to fetch offer' });
  }
});

// =====================================================
// POST /api/offers - Create new offer (draft or send immediately)
// =====================================================
router.post('/', async (req, res) => {
  try {
    const {
      applicationId,
      candidateId,
      companyId,
      jobId,
      candidateName,
      candidateEmail,
      jobTitle,
      department,
      location,
      offerType,
      offerContent,
      offerFile,
      salary,
      salaryCurrency,
      bonus,
      equity,
      benefits,
      startDate,
      expiryDate,
      termsAndConditions,
      internalNotes,
      sendEmail,
      sentBy
    } = req.body;

    if (!applicationId) {
      return res.status(400).json({ error: 'Application ID is required' });
    }

    const offer = new Offer({
      application_id: applicationId,
      candidate_id: candidateId || null,
      company_id: companyId || null,
      job_id: jobId || null,
      candidate_name: candidateName,
      candidate_email: candidateEmail,
      job_title: jobTitle,
      department,
      location,
      offer_type: offerType || 'text',
      offer_content: offerContent,
      offer_file: offerFile || null,
      salary,
      salary_currency: salaryCurrency || 'INR',
      bonus,
      equity,
      benefits,
      start_date: startDate ? new Date(startDate) : null,
      expiry_date: expiryDate ? new Date(expiryDate) : null,
      terms_and_conditions: termsAndConditions,
      internal_notes: internalNotes,
      status: sendEmail ? 'sent' : 'draft',
      sent_at: sendEmail ? new Date() : null,
      sent_by: sendEmail ? sentBy : null,
    });

    await offer.save();

    // Update application stage to offer-sent if sending
    if (sendEmail) {
      await Application.findByIdAndUpdate(applicationId, {
        stage: 'offer-sent',
        status: 'offered',
        last_activity_at: new Date(),
        updatedAt: new Date(),
        $push: {
          stage_history: {
            stage: 'offer-sent',
            entered_at: new Date(),
            action: 'offer_sent',
            moved_by: sentBy,
            notes: `Offer sent: ${salary} ${salaryCurrency || 'INR'}`
          }
        }
      });
    }

    // Log activity
    await new ActivityLog({
      application_id: applicationId,
      company_id: companyId,
      action: sendEmail ? 'offer_sent' : 'offer_drafted',
      description: sendEmail
        ? `Offer sent to ${candidateName} - ${salary} ${salaryCurrency || 'INR'}`
        : `Offer drafted for ${candidateName}`,
      metadata: { offerId: offer._id, salary, offerType }
    }).save();

    console.log(`✅ Offer ${sendEmail ? 'sent' : 'drafted'}:`, offer._id);

    // Send email if requested
    let emailSent = false;
    if (sendEmail && candidateEmail) {
      try {
        await emailService.sendOfferEmail({
          offerId: offer._id,
          candidateName,
          candidateEmail,
          jobTitle,
          department,
          location,
          offerType,
          offerContent,
          offerFile,
          salary,
          salaryCurrency: salaryCurrency || 'INR',
          bonus,
          equity,
          benefits,
          startDate,
          expiryDate,
          termsAndConditions
        });
        emailSent = true;
        console.log('📧 Offer email sent to:', candidateEmail);
      } catch (emailError) {
        console.error('Failed to send offer email:', emailError);
      }
    }

    res.status(201).json({
      success: true,
      data: {
        id: offer._id,
        candidateName: offer.candidate_name,
        jobTitle: offer.job_title,
        status: offer.status,
        emailSent
      },
      message: emailSent
        ? 'Offer sent successfully with email notification'
        : sendEmail
          ? 'Offer created but email failed to send'
          : 'Offer draft saved successfully'
    });
  } catch (error) {
    console.error('Error creating offer:', error);
    res.status(500).json({ error: 'Failed to create offer' });
  }
});

// =====================================================
// PUT /api/offers/:id - Update offer (and optionally resend email)
// =====================================================
router.put('/:id', async (req, res) => {
  try {
    const {
      offerType,
      offerContent,
      offerFile,
      salary,
      salaryCurrency,
      bonus,
      equity,
      benefits,
      startDate,
      expiryDate,
      termsAndConditions,
      internalNotes,
      sendEmail // If true, resend the email after updating
    } = req.body;

    const updateData = { updatedAt: new Date() };
    if (offerType !== undefined) updateData.offer_type = offerType;
    if (offerContent !== undefined) updateData.offer_content = offerContent;
    if (offerFile !== undefined) updateData.offer_file = offerFile;
    if (salary !== undefined) updateData.salary = salary;
    if (salaryCurrency !== undefined) updateData.salary_currency = salaryCurrency;
    if (bonus !== undefined) updateData.bonus = bonus;
    if (equity !== undefined) updateData.equity = equity;
    if (benefits !== undefined) updateData.benefits = benefits;
    if (startDate !== undefined) updateData.start_date = new Date(startDate);
    if (expiryDate !== undefined) updateData.expiry_date = new Date(expiryDate);
    if (termsAndConditions !== undefined) updateData.terms_and_conditions = termsAndConditions;
    if (internalNotes !== undefined) updateData.internal_notes = internalNotes;

    // If resending, update status and sent_at
    if (sendEmail) {
      updateData.status = 'sent';
      updateData.sent_at = new Date();
    }

    const offer = await Offer.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).lean();

    if (!offer) {
      return res.status(404).json({ error: 'Offer not found' });
    }

    // Log activity
    await new ActivityLog({
      application_id: offer.application_id,
      company_id: offer.company_id,
      action: 'offer_updated',
      description: `Offer updated for ${offer.candidate_name}${sendEmail ? ' and resent' : ''}`,
      metadata: { offerId: offer._id, salary, sendEmail }
    }).save();

    // Send email if requested
    let emailSent = false;
    if (sendEmail && offer.candidate_email) {
      try {
        await emailService.sendOfferEmail({
          offerId: offer._id,
          candidateName: offer.candidate_name,
          candidateEmail: offer.candidate_email,
          jobTitle: offer.job_title,
          department: offer.department,
          location: offer.location,
          offerType: offer.offer_type,
          offerContent: offer.offer_content,
          offerFile: offer.offer_file,
          salary: offer.salary,
          salaryCurrency: offer.salary_currency,
          bonus: offer.bonus,
          equity: offer.equity,
          benefits: offer.benefits,
          startDate: offer.start_date,
          expiryDate: offer.expiry_date,
          termsAndConditions: offer.terms_and_conditions
        });
        emailSent = true;
        console.log('📧 Updated offer email sent');
      } catch (emailError) {
        console.error('Failed to send updated offer email:', emailError);
      }
    }

    res.json({
      success: true,
      data: {
        id: offer._id,
        candidateName: offer.candidate_name,
        jobTitle: offer.job_title,
        status: offer.status,
        emailSent
      },
      message: emailSent ? 'Offer updated and email sent' : 'Offer updated successfully'
    });
  } catch (error) {
    console.error('Error updating offer:', error);
    res.status(500).json({ error: 'Failed to update offer' });
  }
});

// =====================================================
// POST /api/offers/:id/send - Send a draft offer
// =====================================================
router.post('/:id/send', async (req, res) => {
  try {
    const { sentBy } = req.body;

    const offer = await Offer.findById(req.params.id);

    if (!offer) {
      return res.status(404).json({ error: 'Offer not found' });
    }

    if (offer.status !== 'draft') {
      return res.status(400).json({ error: 'Only draft offers can be sent' });
    }

    offer.status = 'sent';
    offer.sent_at = new Date();
    offer.sent_by = sentBy;
    await offer.save();

    // Update application stage
    await Application.findByIdAndUpdate(offer.application_id, {
      stage: 'offer-sent',
      status: 'offered',
      last_activity_at: new Date(),
      updatedAt: new Date(),
      $push: {
        stage_history: {
          stage: 'offer-sent',
          entered_at: new Date(),
          action: 'offer_sent',
          moved_by: sentBy,
          notes: `Offer sent: ${offer.salary} ${offer.salary_currency}`
        }
      }
    });

    // Log activity
    await new ActivityLog({
      application_id: offer.application_id,
      company_id: offer.company_id,
      action: 'offer_sent',
      description: `Offer sent to ${offer.candidate_name}`,
      metadata: { offerId: offer._id }
    }).save();

    // Send email
    let emailSent = false;
    if (offer.candidate_email) {
      try {
        await emailService.sendOfferEmail({
          offerId: offer._id,
          candidateName: offer.candidate_name,
          candidateEmail: offer.candidate_email,
          jobTitle: offer.job_title,
          department: offer.department,
          location: offer.location,
          offerType: offer.offer_type,
          offerContent: offer.offer_content,
          offerFile: offer.offer_file,
          salary: offer.salary,
          salaryCurrency: offer.salary_currency,
          bonus: offer.bonus,
          equity: offer.equity,
          benefits: offer.benefits,
          startDate: offer.start_date,
          expiryDate: offer.expiry_date,
          termsAndConditions: offer.terms_and_conditions
        });
        emailSent = true;
        console.log('📧 Offer email sent to:', offer.candidate_email);
      } catch (emailError) {
        console.error('Failed to send offer email:', emailError);
      }
    }

    res.json({
      success: true,
      data: { id: offer._id, status: 'sent', emailSent },
      message: emailSent ? 'Offer sent successfully' : 'Offer marked as sent but email failed'
    });
  } catch (error) {
    console.error('Error sending offer:', error);
    res.status(500).json({ error: 'Failed to send offer' });
  }
});

// =====================================================
// PATCH /api/offers/:id/status - Update offer status (accept/reject/negotiate)
// =====================================================
router.patch('/:id/status', async (req, res) => {
  try {
    const { status, responseNotes, actionBy } = req.body;

    const validStatuses = ['accepted', 'rejected', 'negotiating', 'expired', 'withdrawn'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const offer = await Offer.findById(req.params.id);

    if (!offer) {
      return res.status(404).json({ error: 'Offer not found' });
    }

    const previousStatus = offer.status;
    offer.status = status;
    offer.response_date = new Date();
    if (responseNotes) offer.response_notes = responseNotes;

    // Add to negotiation history
    offer.negotiation_history.push({
      date: new Date(),
      action: status,
      details: responseNotes || `Status changed from ${previousStatus} to ${status}`,
      by: actionBy || 'Candidate'
    });

    await offer.save();

    // Update application stage based on offer status
    if (status === 'accepted') {
      await Application.findByIdAndUpdate(offer.application_id, {
        stage: 'offer-accepted',
        status: 'hired',
        last_activity_at: new Date(),
        updatedAt: new Date(),
        $push: {
          stage_history: {
            stage: 'offer-accepted',
            entered_at: new Date(),
            action: 'offer_accepted',
            moved_by: actionBy || 'Candidate',
            notes: responseNotes || 'Candidate accepted the offer'
          }
        }
      });
    } else if (status === 'rejected') {
      await Application.findByIdAndUpdate(offer.application_id, {
        last_activity_at: new Date(),
        updatedAt: new Date(),
        $push: {
          stage_history: {
            stage: 'offer-sent',
            action: 'offer_rejected',
            moved_by: actionBy || 'Candidate',
            notes: responseNotes || 'Candidate rejected the offer'
          }
        }
      });
    }

    // Log activity
    await new ActivityLog({
      application_id: offer.application_id,
      company_id: offer.company_id,
      action: `offer_${status}`,
      description: `Offer ${status} by ${actionBy || 'Candidate'}`,
      metadata: { offerId: offer._id, responseNotes }
    }).save();

    console.log(`✅ Offer ${status}:`, offer._id);

    res.json({
      success: true,
      data: { id: offer._id, status: offer.status },
      message: `Offer ${status} successfully`
    });
  } catch (error) {
    console.error('Error updating offer status:', error);
    res.status(500).json({ error: 'Failed to update offer status' });
  }
});

// =====================================================
// POST /api/offers/:id/resend - Resend offer email
// =====================================================
router.post('/:id/resend', async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);

    if (!offer) {
      return res.status(404).json({ error: 'Offer not found' });
    }

    if (!offer.candidate_email) {
      return res.status(400).json({ error: 'Candidate email not found' });
    }

    try {
      await emailService.sendOfferEmail({
        offerId: offer._id,
        candidateName: offer.candidate_name,
        candidateEmail: offer.candidate_email,
        jobTitle: offer.job_title,
        department: offer.department,
        location: offer.location,
        offerType: offer.offer_type,
        offerContent: offer.offer_content,
        offerFile: offer.offer_file,
        salary: offer.salary,
        salaryCurrency: offer.salary_currency,
        bonus: offer.bonus,
        equity: offer.equity,
        benefits: offer.benefits,
        startDate: offer.start_date,
        expiryDate: offer.expiry_date,
        termsAndConditions: offer.terms_and_conditions
      });

      console.log('📧 Offer email resent to:', offer.candidate_email);

      res.json({
        success: true,
        message: 'Offer email resent successfully'
      });
    } catch (emailError) {
      console.error('Failed to resend offer email:', emailError);
      res.status(500).json({ error: 'Failed to send email' });
    }
  } catch (error) {
    console.error('Error resending offer:', error);
    res.status(500).json({ error: 'Failed to resend offer' });
  }
});

// =====================================================
// Helper functions for generating HTML pages
// =====================================================

function generateOfferResponsePage(offer) {
  const displayStartDate = offer.start_date ? new Date(offer.start_date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : 'To be discussed';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Offer Response - ${offer.job_title} | AI Planet</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f1f5f9; min-height: 100vh; padding: 20px; }
    .container { max-width: 700px; margin: 0 auto; }
    .card { background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden; margin-bottom: 20px; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px; color: white; text-align: center; }
    .logo { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
    .logo span { color: #d1fae5; }
    .header h1 { font-size: 24px; margin-bottom: 8px; }
    .header p { opacity: 0.9; }
    .content { padding: 32px; }
    .offer-details { background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 24px; }
    .offer-details h3 { font-size: 14px; color: #64748b; text-transform: uppercase; margin-bottom: 16px; }
    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { color: #64748b; }
    .detail-value { color: #1e293b; font-weight: 600; }
    .salary { color: #10b981; font-size: 18px; }
    .buttons { display: flex; gap: 16px; margin-top: 24px; }
    .btn { flex: 1; padding: 16px 24px; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
    .btn-accept { background: #10b981; color: white; }
    .btn-accept:hover { background: #059669; }
    .btn-reject { background: #f1f5f9; color: #64748b; border: 2px solid #e2e8f0; }
    .btn-reject:hover { background: #e2e8f0; color: #475569; }
    .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; align-items: center; justify-content: center; padding: 20px; }
    .modal.active { display: flex; }
    .modal-content { background: white; border-radius: 12px; max-width: 500px; width: 100%; max-height: 90vh; overflow-y: auto; }
    .modal-header { padding: 24px; border-bottom: 1px solid #e2e8f0; }
    .modal-header h2 { font-size: 20px; color: #1e293b; }
    .modal-body { padding: 24px; }
    .form-group { margin-bottom: 20px; }
    .form-group label { display: block; color: #374151; font-weight: 500; margin-bottom: 8px; }
    .form-group input, .form-group textarea, .form-group select { width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; }
    .form-group input:focus, .form-group textarea:focus, .form-group select:focus { outline: none; border-color: #10b981; box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1); }
    .form-group textarea { resize: vertical; min-height: 80px; }
    .form-group .hint { font-size: 12px; color: #6b7280; margin-top: 4px; }
    .modal-footer { padding: 16px 24px; background: #f8fafc; display: flex; gap: 12px; justify-content: flex-end; }
    .modal-footer .btn { flex: 0; padding: 12px 24px; }
    .warning-box { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin-bottom: 20px; }
    .warning-box p { color: #92400e; font-size: 14px; }
    .success-icon { font-size: 48px; margin-bottom: 16px; }
    .close-btn { position: absolute; top: 16px; right: 16px; background: none; border: none; font-size: 24px; cursor: pointer; color: #64748b; }
    @media (max-width: 600px) { .buttons { flex-direction: column; } }
  </style>
</head>
<body data-offer-id="${offer._id}">
  <div class="container">
    <div class="card">
      <div class="header">
        <div class="logo">AI<span>Planet</span></div>
        <h1>Job Offer</h1>
        <p>${offer.job_title}</p>
      </div>
      <div class="content">
        <p style="color: #475569; margin-bottom: 24px;">
          Dear <strong>${offer.candidate_name}</strong>,<br><br>
          We are pleased to extend the following offer for the position of <strong>${offer.job_title}</strong> at AI Planet.
        </p>

        <div class="offer-details">
          <h3>Offer Details</h3>
          <div class="detail-row">
            <span class="detail-label">Position</span>
            <span class="detail-value">${offer.job_title}</span>
          </div>
          ${offer.department ? `<div class="detail-row">
            <span class="detail-label">Department</span>
            <span class="detail-value">${offer.department}</span>
          </div>` : ''}
          ${offer.location ? `<div class="detail-row">
            <span class="detail-label">Location</span>
            <span class="detail-value">${offer.location}</span>
          </div>` : ''}
          <div class="detail-row">
            <span class="detail-label">Annual Salary</span>
            <span class="detail-value salary">${offer.salary} ${offer.salary_currency || 'INR'}</span>
          </div>
          ${offer.bonus ? `<div class="detail-row">
            <span class="detail-label">Bonus</span>
            <span class="detail-value">${offer.bonus}</span>
          </div>` : ''}
          ${offer.benefits ? `<div class="detail-row">
            <span class="detail-label">Benefits</span>
            <span class="detail-value">${offer.benefits}</span>
          </div>` : ''}
          <div class="detail-row">
            <span class="detail-label">Proposed Start Date</span>
            <span class="detail-value">${displayStartDate}</span>
          </div>
        </div>

        <div class="buttons">
          <button type="button" class="btn btn-accept" id="acceptBtn">Accept Offer</button>
          <button type="button" class="btn btn-reject" id="rejectBtn">Decline Offer</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Accept Modal -->
  <div class="modal" id="acceptModal">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Accept Offer</h2>
      </div>
      <form id="acceptForm">
        <div class="modal-body">
          <div class="warning-box">
            <p><strong>Please confirm:</strong> By accepting this offer, you are committing to join AI Planet as ${offer.job_title}.</p>
          </div>

          <div class="form-group">
            <label>Preferred Start Date *</label>
            <input type="date" name="preferredStartDate" required>
            <div class="hint">When would you like to start?</div>
          </div>

          <div class="form-group">
            <label>Contact Number *</label>
            <input type="tel" name="contactNumber" placeholder="+91 XXXXX XXXXX" required>
          </div>

          <div class="form-group">
            <label>Current Location *</label>
            <input type="text" name="currentLocation" placeholder="City, State" required>
          </div>

          <div class="form-group">
            <label>Permanent Address</label>
            <textarea name="permanentAddress" placeholder="Full address for documentation"></textarea>
          </div>

          <div class="form-group">
            <label>Emergency Contact</label>
            <input type="text" name="emergencyContact" placeholder="Name and phone number">
          </div>

          <div class="form-group">
            <label>Additional Notes</label>
            <textarea name="additionalNotes" placeholder="Any questions or notes for the HR team"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-reject" id="cancelAcceptBtn">Cancel</button>
          <button type="submit" class="btn btn-accept">Confirm Acceptance</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Reject Modal -->
  <div class="modal" id="rejectModal">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Decline Offer</h2>
      </div>
      <form id="rejectForm">
        <div class="modal-body">
          <div class="form-group">
            <label>Reason for Declining *</label>
            <select name="reason" id="rejectReason" required>
              <option value="">Select a reason</option>
              <option value="Accepted another offer">Accepted another offer</option>
              <option value="Compensation not satisfactory">Compensation not satisfactory</option>
              <option value="Location/relocation concerns">Location/relocation concerns</option>
              <option value="Role not a good fit">Role not a good fit</option>
              <option value="Personal reasons">Personal reasons</option>
              <option value="Staying with current employer">Staying with current employer</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div class="form-group" id="otherReasonGroup" style="display: none;">
            <label>Please specify *</label>
            <input type="text" name="otherReason" id="otherReasonInput" placeholder="Your reason">
          </div>

          <div class="form-group">
            <label>Additional Feedback (Optional)</label>
            <textarea name="feedback" placeholder="We appreciate any feedback to help us improve our hiring process"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-reject" id="cancelRejectBtn">Cancel</button>
          <button type="submit" class="btn" style="background: #ef4444; color: white;">Confirm Decline</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Success Modal -->
  <div class="modal" id="successModal">
    <div class="modal-content" style="text-align: center; padding: 48px;">
      <div class="success-icon" id="successIcon"></div>
      <h2 id="successTitle" style="margin-bottom: 16px;"></h2>
      <p id="successMessage" style="color: #64748b;"></p>
    </div>
  </div>

  <script src="/api/offers/respond-script.js"></script>
</body>
</html>`;
}

function generateSuccessPage(title, message, offer) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | AI Planet</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f1f5f9; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .card { background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); max-width: 500px; width: 100%; text-align: center; padding: 48px 32px; }
    .icon { font-size: 64px; margin-bottom: 24px; }
    h1 { color: #10b981; font-size: 24px; margin-bottom: 16px; }
    p { color: #64748b; line-height: 1.6; }
    .logo { font-size: 20px; font-weight: 700; color: #1e293b; margin-top: 32px; }
    .logo span { color: #10b981; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🎉</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <div class="logo">AI<span>Planet</span></div>
  </div>
</body>
</html>`;
}

function generateErrorPage(title, message) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | AI Planet</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f1f5f9; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .card { background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); max-width: 500px; width: 100%; text-align: center; padding: 48px 32px; }
    .icon { font-size: 64px; margin-bottom: 24px; }
    h1 { color: #ef4444; font-size: 24px; margin-bottom: 16px; }
    p { color: #64748b; line-height: 1.6; }
    .logo { font-size: 20px; font-weight: 700; color: #1e293b; margin-top: 32px; }
    .logo span { color: #10b981; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">😕</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <div class="logo">AI<span>Planet</span></div>
  </div>
</body>
</html>`;
}

// =====================================================
// DELETE /api/offers/:id - Delete offer
// =====================================================
router.delete('/:id', async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);

    if (!offer) {
      return res.status(404).json({ error: 'Offer not found' });
    }

    // Only allow deleting draft offers
    if (offer.status !== 'draft') {
      return res.status(400).json({ error: 'Only draft offers can be deleted' });
    }

    await Offer.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Offer deleted successfully' });
  } catch (error) {
    console.error('Error deleting offer:', error);
    res.status(500).json({ error: 'Failed to delete offer' });
  }
});

module.exports = router;
