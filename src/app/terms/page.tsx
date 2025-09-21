"use client";
import { SITE_CONFIG } from "@/lib/constants";

export default function TermsOfService() {
  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="card">
            <div className="card-header">
              <h1 className="h3 mb-0">Terms of Service</h1>
              <small className="text-muted">{SITE_CONFIG.address} - Parking Agreement</small>
            </div>
            <div className="card-body">
              <div className="mb-4">
                <h4>1. Parking at Your Own Risk</h4>
                <p>
                  By using this parking space, you acknowledge and agree that you park your vehicle entirely at your own risk. 
                  The property owner, landlord, and any affiliated parties are not responsible for any damage, theft, vandalism, 
                  or loss that may occur to your vehicle or its contents while parked on the premises.
                </p>
              </div>

              <div className="mb-4">
                <h4>2. No Liability for Damage</h4>
                <p>
                  The property owner shall not be liable for any damage to your vehicle caused by, but not limited to:
                </p>
                <ul>
                  <li>Weather conditions (hail, snow, ice, wind, etc.)</li>
                  <li>Falling objects (tree branches, debris, etc.)</li>
                  <li>Acts of vandalism or theft by third parties</li>
                  <li>Other vehicles or pedestrians</li>
                  <li>Normal wear and tear</li>
                  <li>Any other causes beyond the property owner's control</li>
                </ul>
              </div>

              <div className="mb-4">
                <h4>3. Vehicle Security</h4>
                <p>
                  You are solely responsible for securing your vehicle and any belongings left inside. 
                  We strongly recommend locking your vehicle and not leaving valuable items visible.
                </p>
              </div>

              <div className="mb-4">
                <h4>4. Compliance with Rules</h4>
                <p>
                  By booking a parking space, you agree to:
                </p>
                <ul>
                  <li>Park only in your designated spot (Northern or Southern)</li>
                  <li>Park only during your reserved time period</li>
                  <li>Not block access to other parking spaces or building entrances</li>
                  <li>Comply with all local traffic and parking regulations</li>
                  <li>Display the correct license plate number as registered</li>
                </ul>
              </div>

              <div className="mb-4">
                <h4>5. Payment and Cancellation</h4>
                <p>
                  Payment must be made via e-transfer to andrewjohnmcgrath@gmail.com within 24 hours of booking. 
                  Failure to pay may result in cancellation of your reservation. Refunds are at the discretion of the property owner.
                </p>
              </div>

              <div className="mb-4">
                <h4>6. Indemnification</h4>
                <p>
                  You agree to indemnify and hold harmless the property owner from any claims, damages, losses, or expenses 
                  arising from your use of the parking space, including but not limited to damage you may cause to other vehicles 
                  or property.
                </p>
              </div>

              <div className="mb-4">
                <h4>7. Modification of Terms</h4>
                <p>
                  These terms may be updated at any time without prior notice. Continued use of the parking service 
                  constitutes acceptance of any modified terms.
                </p>
              </div>

              <div className="alert alert-warning">
                <strong>Important:</strong> By checking the "I agree to the Terms of Service" box during booking, 
                you acknowledge that you have read, understood, and agree to be bound by these terms.
              </div>
            </div>
            <div className="card-footer text-center">
              <button className="btn btn-secondary" onClick={() => window.close()}>
                Close Window
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
