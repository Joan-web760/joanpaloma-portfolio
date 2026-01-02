'use client';

import { useEffect, useMemo, useState } from 'react';

export default function ImageGallery({ open, onClose, title, description, images = [] }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (open) setActive(0);
  }, [open]);

  const activeImage = useMemo(() => images?.[active], [images, active]);

  if (!open) return null;

  return (
    <div className="modal d-block" tabIndex="-1" role="dialog" style={{ background: 'rgba(0,0,0,.7)' }}>
      <div className="modal-dialog modal-xl modal-dialog-centered" role="document">
        <div className="modal-content bg-dark text-light border-0">
          <div className="modal-header border-0">
            <div>
              <div className="h5 mb-1">{title}</div>
              {description ? <div className="small opacity-75">{description}</div> : null}
            </div>

            <button type="button" className="btn btn-outline-light btn-sm" onClick={onClose}>
              Close
            </button>
          </div>

          <div className="modal-body">
            {!images.length ? (
              <div className="text-center opacity-75 py-5">No images.</div>
            ) : (
              <>
                <div className="text-center mb-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={activeImage?.src}
                    alt={activeImage?.alt || title}
                    className="img-fluid rounded"
                    style={{ maxHeight: '70vh' }}
                  />
                </div>

                {images.length > 1 ? (
                  <div className="d-flex flex-wrap gap-2 justify-content-center">
                    {images.map((img, idx) => (
                      <button
                        key={img.id}
                        className={`btn btn-sm ${idx === active ? 'btn-primary' : 'btn-outline-light'}`}
                        onClick={() => setActive(idx)}
                      >
                        {idx + 1}
                      </button>
                    ))}
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
