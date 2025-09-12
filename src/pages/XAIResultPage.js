import React from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Card, Space, Typography, Button, Row, Col, Descriptions, Tag, Alert, Spin, message, Image, Divider, Input, Tabs } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import request from '../services/api/request';
import { API_ENDPOINTS, API_BASE_URL } from '../services/api/config';
import { feedbackAPI } from '../services/api/ecg';

const { Title, Text } = Typography;

const XAIResultPage = () => {
  const { instanceId, patientId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState(location.state?.xaiData || null);
  const [doctorNotes, setDoctorNotes] = React.useState('');
  const [localFeedback, setLocalFeedback] = React.useState({}); // key `${instanceId}|${abnormality}` -> { decision, notes }
  const [downloadingMap, setDownloadingMap] = React.useState({}); // instanceId -> boolean
  const [submittedFeedback, setSubmittedFeedback] = React.useState({}); // persisted or locally-submitted snapshot

  // Map codes to human-readable names for display
  const DISPLAY_NAME = {
    AF: 'Atrial Fibrillation',
    AFIB: 'Atrial Fibrillation',
    ST: 'Sinus Tachycardia',
    STACH: 'Sinus Tachycardia',
    SB: 'Sinus Bradycardia',
    SBRAD: 'Sinus Bradycardia',
    NORM: 'Normal ECG',
    '1dAVB': 'First-degree AV Block',
    '2dAVB': 'Second-degree AV Block',
    '3dAVB': 'Third-degree AV Block',
    LBBB: 'Left Bundle Branch Block',
    RBBB: 'Right Bundle Branch Block',
    AFLT: 'Atrial Flutter',
    PAC: 'Premature Atrial Complex',
    PVC: 'Premature Ventricular Complex',
  };
  const toDisplay = (code) => DISPLAY_NAME[code] || code;

  const fetchXAI = React.useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      const searchParams = new URLSearchParams(location.search);
      const ds = searchParams.getAll('d');
      const ls = searchParams.getAll('l'); // optional labels (e.g., "AFIB (74%)")
      const diseases = ds.length > 0 ? ds : [];

      // Map UI codes to server-supported codes
      const SERVER_CODE_MAP = {
        // Canonical
        AFIB: 'AFIB', STACH: 'STACH', LBBB: 'LBBB', RBBB: 'RBBB',
        '1dAVB': '1dAVB', '2dAVB': '2dAVB', '3dAVB': '3dAVB',
        SBRAD: 'SBRAD', AFLT: 'AFLT', NORM: 'NORM', PAC: 'PAC', PVC: 'PVC',
        // Synonyms
        AF: 'AFIB', ST: 'STACH', SB: 'SBRAD', NR: 'NORM', NSR: 'NORM', AFL: 'AFLT',
        '1AVB': '1dAVB', '2AVB': '2dAVB', '3AVB': '3dAVB'
      };
      const SERVER_ALLOWED = new Set(['AFIB','STACH','LBBB','RBBB','1dAVB','2dAVB','3dAVB','SBRAD','AFLT','NORM','PAC','PVC']);
      const diseasesServer = Array.from(new Set((diseases || []).map(c => SERVER_CODE_MAP[c] || null).filter(c => SERVER_ALLOWED.has(c))));

      if (diseasesServer.length === 0) {
        throw new Error('No abnormalities selected. Please go back and choose from predictions.');
      }
      diseasesServer.forEach(d => params.append('disease', d));
      if (patientId) {
        // Fetch all instances for the patient, then run XAI for each
        const files = await request.get(`${API_ENDPOINTS.ECG}/patient/${patientId}/files`);
        const allInstanceIds = (files || []).flatMap(f => f.instanceIDs || []);
        const results = [];
        for (const id of allInstanceIds) {
          try {
            const res = await request.post(`${API_ENDPOINTS.ECG}/interpretation/${id}`, params.toString(), {
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              timeout: 60000
            });
            results.push({ instance_id: id, payload: res });
          } catch (e) {
            results.push({ instance_id: id, error: e?.message || 'XAI failed' });
          }
        }
        setData({ multi: true, items: results });
      } else {
        const res = await request.post(`${API_ENDPOINTS.ECG}/interpretation/${instanceId}`, params.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 60000
        });
        // Attach original codes and optional labels for display purposes
        setData({
          ...(typeof res === 'object' ? res : {}),
          _requested_codes: diseases,
          _requested_labels: ls && ls.length === diseases.length ? ls : null,
        });
      }
    } catch (e) {
      console.error(e);
      message.error(e?.message || 'Failed to load XAI results');
    } finally {
      setLoading(false);
    }
  }, [instanceId, patientId, location.search]);

  React.useEffect(() => { fetchXAI(); }, [fetchXAI]);

  const resolveImageUrl = (url) => {
    if (!url) return url;
    if (/^https?:\/\//i.test(url)) return url;
    if (url.startsWith('/')) return `${API_BASE_URL}${url}`;
    return `${API_BASE_URL}/${url}`;
  };

  const AuthImage = ({ url, alt }) => {
    const [src, setSrc] = React.useState(resolveImageUrl(url));
    const triedRef = React.useRef(false);

    const handleError = async () => {
      if (triedRef.current) return;
      triedRef.current = true;
      try {
        const absolute = resolveImageUrl(url);
        const blob = await request.get(absolute, { responseType: 'blob' });
        const objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      } catch (e) {
        // leave broken if cannot fetch
      }
    };

    React.useEffect(() => () => {
      if (src && src.startsWith('blob:')) URL.revokeObjectURL(src);
    }, [src]);

    return (
      <Image src={src} alt={alt} style={{ width: '100%', borderRadius: 4 }} onError={handleError} />
    );
  };

  const downloadFile = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleDownloadPdf = async (targetInstanceId) => {
    try {
      setDownloadingMap(prev => ({ ...prev, [targetInstanceId]: true }));
      message.loading('Preparing download…', 0);
      const searchParams = new URLSearchParams(location.search);
      const ds = searchParams.getAll('d');
      const SERVER_CODE_MAP = { AFIB:'AFIB', STACH:'STACH', LBBB:'LBBB', RBBB:'RBBB', '1dAVB':'1dAVB', '2dAVB':'2dAVB', '3dAVB':'3dAVB', SBRAD:'SBRAD', AFLT:'AFLT', NORM:'NORM', PAC:'PAC', PVC:'PVC', AF:'AFIB', ST:'STACH', SB:'SBRAD', NR:'NORM', NSR:'NORM', AFL:'AFLT', '1AVB':'1dAVB', '2AVB':'2dAVB', '3AVB':'3dAVB' };
      const SERVER_ALLOWED = new Set(['AFIB','STACH','LBBB','RBBB','1dAVB','2dAVB','3dAVB','SBRAD','AFLT','NORM','PAC','PVC']);
      const diseases = Array.from(new Set((ds || []).map(c => SERVER_CODE_MAP[c] || null).filter(c => SERVER_ALLOWED.has(c))));
      if (!diseases || diseases.length === 0) {
        message.error('Please select one or more abnormalities before downloading the report.');
        return;
      }
      const params = new URLSearchParams();
      diseases.forEach(d => params.append('disease', d));
      // Attach doctor notes (global)
      if (doctorNotes && doctorNotes.trim()) {
        params.append('doctor_notes', doctorNotes.trim());
      }
      // Attach per-abnormality feedback for this instance (persisted and local)
      const fbEntries = Object.entries(localFeedback)
        .filter(([key]) => key.startsWith(`${targetInstanceId}|`))
        .map(([key, val]) => ({ abnormality: key.split('|')[1], decision: val?.decision, notes: val?.notes }));
      if (fbEntries.length > 0) {
        params.append('feedback_json', JSON.stringify(fbEntries));
        // Fallback plain-text summary for servers that don't read JSON param
        const summary = fbEntries
          .map((f) => `${f.abnormality}: ${f.decision || 'approve'}${f.notes ? ` - ${f.notes}` : ''}`)
          .join('\n');
        params.append('doctor_feedback', summary);
      }

      const gen = await request.post(`${API_ENDPOINTS.ECG}/interpretation-pdf/${targetInstanceId}`, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      // Prefer server-provided URL if present
      const serverUrl = gen?.pdf_url ? (gen.pdf_url.startsWith('http') ? gen.pdf_url : `${API_BASE_URL}${gen.pdf_url.startsWith('/') ? '' : '/'}${gen.pdf_url}`) : null;

      const downloadUrl = serverUrl || `${API_BASE_URL}${API_ENDPOINTS.ECG}/reports/${targetInstanceId}`;

      // Try to fetch as blob (authenticated)
      try {
        const blob = await request.get(downloadUrl, { responseType: 'blob' });
        downloadFile(blob, `ecg_interpretation_${targetInstanceId}.pdf`);
        message.destroy();
        message.success('Downloading report');
        return;
      } catch (e) {
        // Fallback: open in new tab if direct fetch blocked by CORS
        window.open(downloadUrl, '_blank');
        message.destroy();
        message.info('Preparing to download… opened in a new tab');
      }
    } catch (e) {
      console.error(e);
      message.destroy();
      message.error('Failed to generate or download the PDF report');
    }
    finally {
      setDownloadingMap(prev => ({ ...prev, [targetInstanceId]: false }));
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Space align="center" style={{ justifyContent: 'space-between', width: '100%' }}>
          <Title level={2} style={{ margin: 0 }}>XAI Interpretation</Title>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>Back</Button>
            <Button onClick={fetchXAI}>Refresh</Button>
            {!patientId && (
              <Button type="primary" loading={!!downloadingMap[instanceId]} onClick={() => handleDownloadPdf(instanceId)}>
                {downloadingMap[instanceId] ? 'Preparing…' : 'Download PDF'}
              </Button>
            )}
            {/* Doctor Feedback removed */}
          </Space>
        </Space>

        <Card>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Spin size="large" />
              <div style={{ marginTop: 8 }}>Loading results…</div>
            </div>
          ) : data ? (
            <Space direction="vertical" style={{ width: '100%' }}>
              {data.multi ? (
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Alert showIcon type="info" message={`Fetched XAI for ${data.items.length} instances`} />
                  <Tabs
                    tabPosition="top"
                    items={data.items.map((it, idx) => ({
                      key: String(idx),
                      label: it.instance_id,
                      children: (
                        <Card title={`Instance ${it.instance_id}`} extra={<Space><Button size="small" loading={!!downloadingMap[it.instance_id]} onClick={() => handleDownloadPdf(it.instance_id)}>{downloadingMap[it.instance_id] ? 'Preparing…' : 'Download PDF'}</Button></Space>}>
                          {it.error ? (
                            <Alert type="error" showIcon message={it.error} />
                          ) : (
                            <>
                              <Descriptions bordered column={1} size="small" style={{ marginBottom: 16 }}>
                                <Descriptions.Item label="Abnormalities">{(it.payload.abnormalities || []).map(toDisplay).join(', ')}</Descriptions.Item>
                                <Descriptions.Item label="Status">{it.payload.status || 'success'}</Descriptions.Item>
                                {it.payload.message && (
                                  <Descriptions.Item label="Message">{it.payload.message}</Descriptions.Item>
                                )}
                              </Descriptions>
                              <Row gutter={[16, 16]}>
                                {(it.payload.results || []).map((r, idxR) => {
                                  const imageUrls = r.images || r.image_urls || Object.values((r.report && r.report.image_paths) || {});
                                  const keyMulti = `${it.instance_id}|${r.abnormality}`;
                                  return (
                                    <Col key={idxR} xs={24} md={12}>
                                      <Card size="small" title={
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                          <span>{toDisplay(r.abnormality) || 'Result'}</span>
                                          <Tag color={r.status === 'ok' ? 'green' : r.status === 'skipped' ? 'gold' : 'blue'}>
                                            {(r.status || 'ok').toUpperCase()}
                                          </Tag>
                                        </div>
                                      }>
                                        <Space direction="vertical" style={{ width: '100%' }}>
                                          {r.status === 'skipped' && r.reason && (
                                            <Alert type="warning" showIcon message={`Skipped: ${r.reason}`} />
                                          )}
                                          {r.report?.report_text && (
                                            <div>
                                              <Text strong>Report</Text>
                                              <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{r.report.report_text}</pre>
                                            </div>
                                          )}
                                          {r.report?.metrics && (
                                            <Descriptions bordered size="small" column={1}>
                                              {Object.entries(r.report.metrics).map(([k, v]) => (
                                                <Descriptions.Item key={k} label={k}>
                                                  {typeof v === 'object' ? (
                                                    <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{JSON.stringify(v, null, 2)}</pre>
                                                  ) : (
                                                    String(v)
                                                  )}
                                                </Descriptions.Item>
                                              ))}
                                            </Descriptions>
                                          )}
                                          {imageUrls && imageUrls.length > 0 && (
                                            <div>
                                              <Divider style={{ margin: '8px 0' }}>Artifacts</Divider>
                                              <Image.PreviewGroup>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
                                                  {imageUrls.map((url, i2) => (
                                                    <AuthImage key={i2} url={url} alt={`xai-${i2}`} />
                                                  ))}
                                                </div>
                                              </Image.PreviewGroup>
                                            </div>
                                          )}
                                          <div style={{ marginTop: 12 }}>
                                            <Divider orientation="center" style={{ margin: '12px 0' }}>
                                              <Text strong>Doctor Feedback</Text>
                                            </Divider>
                                            <Space direction="vertical" size={8} style={{ width: '100%' }}>
                                              <Space size={8}>
                                                <Button
                                                  size="small"
                                                  shape="round"
                                                  type={localFeedback[keyMulti]?.decision === 'approve' ? 'primary' : 'default'}
                                                  style={localFeedback[keyMulti]?.decision === 'approve' ? { backgroundColor: '#52c41a', borderColor: '#52c41a', color: '#fff' } : undefined}
                                                  onClick={() => setLocalFeedback(prev => ({ ...prev, [keyMulti]: { ...(prev[keyMulti] || {}), decision: 'approve' } }))}
                                                >
                                                  Approve
                                                </Button>
                                                <Button
                                                  size="small"
                                                  shape="round"
                                                  type={localFeedback[keyMulti]?.decision === 'correct' ? 'primary' : 'default'}
                                                  style={localFeedback[keyMulti]?.decision === 'correct' ? { backgroundColor: '#faad14', borderColor: '#faad14', color: '#fff' } : undefined}
                                                  onClick={() => setLocalFeedback(prev => ({ ...prev, [keyMulti]: { ...(prev[keyMulti] || {}), decision: 'correct' } }))}
                                                >
                                                  Correct
                                                </Button>
                                              </Space>
                                              <Input.TextArea
                                                allowClear
                                                autoSize={{ minRows: 3, maxRows: 5 }}
                                                placeholder="Doctor notes"
                                                value={localFeedback[keyMulti]?.notes || ''}
                                                onChange={(e) => {
                                                  const val = e.target.value;
                                                  const key = keyMulti;
                                                  setLocalFeedback(prev => ({ ...prev, [key]: { ...(prev[key] || {}), notes: val } }));
                                                }}
                                              />
                                              <Button
                                                size="small"
                                                type="primary"
                                                shape="round"
                                                onClick={async () => {
                                                  try {
                                                    const key = keyMulti;
                                                    const payload = {
                                                      instance_id: it.instance_id,
                                                      abnormality: r.abnormality,
                                                      decision: localFeedback[key]?.decision || 'approve',
                                                      notes: localFeedback[key]?.notes || ''
                                                    };
                                                    await feedbackAPI.submitFeedback(payload);
                                                    setSubmittedFeedback(prev => ({ ...prev, [key]: { decision: payload.decision, notes: payload.notes } }));
                                                    // Clear the textarea for this item after submit
                                                    setLocalFeedback(prev => ({ ...prev, [key]: { ...(prev[key] || {}), notes: '' } }));
                                                    message.success('Feedback saved');
                                                  } catch (e) {
                                                    message.error('Failed to save feedback');
                                                  }
                                                }}
                                              >
                                                Submit
                                              </Button>
                                              {submittedFeedback[keyMulti] && (
                                                <div style={{ marginTop: 8 }}>
                                                  <Text strong>Status:</Text> {submittedFeedback[keyMulti].decision || 'approve'}
                                                  {submittedFeedback[keyMulti].notes ? (
                                                    <div><Text strong>Notes:</Text> {submittedFeedback[keyMulti].notes}</div>
                                                  ) : null}
                                                </div>
                                              )}
                                            </Space>
                                          </div>
                                        </Space>
                                      </Card>
                                    </Col>
                                  );
                                })}
                              </Row>
                            </>
                          )}
                        </Card>
                      )
                    }))}
                  />
                </Space>
              ) : (
                <>
                  <Descriptions bordered column={1} size="small">
                    <Descriptions.Item label="Instance ID">{data.instance_id || instanceId}</Descriptions.Item>
                    {Array.isArray(data.abnormalities) && (
                      <Descriptions.Item label="Requested Abnormalities">
                        {(() => {
                          const codes = data._requested_codes || data.abnormalities;
                          const labels = (data._requested_labels && data._requested_labels.length === codes.length)
                            ? data._requested_labels
                            : codes.map(c => toDisplay(c));
                          return labels.join(', ');
                        })()}
                      </Descriptions.Item>
                    )}
                    <Descriptions.Item label="Status">{data.status || 'success'}</Descriptions.Item>
                  </Descriptions>

                  <Divider style={{ margin: '12px 0' }} />

                  {(() => {
                    const results = Array.isArray(data.results) ? data.results : [];
                    const activeFromQuery = new URLSearchParams(location.search).get('active');
                    const items = results.map((r) => {
                      const imageUrls = r.images || r.image_urls || Object.values((r.report && r.report.image_paths) || {});
                      return {
                        key: r.abnormality,
                        label: toDisplay(r.abnormality) || r.abnormality,
                        children: (
                          <Card
                            size="small"
                            title={
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>{toDisplay(r.abnormality) || 'Result'}</span>
                                <Tag color={r.status === 'ok' ? 'green' : r.status === 'skipped' ? 'gold' : 'blue'}>
                                  {(r.status || 'ok').toUpperCase()}
                                </Tag>
                              </div>
                            }
                          >
                            <Space direction="vertical" style={{ width: '100%' }}>
                              {r.status === 'skipped' && r.reason && (
                                <Alert type="warning" showIcon message={`Skipped: ${r.reason}`} />
                              )}
                              {r.report?.report_text && (
                                <div>
                                  <Text strong>Report</Text>
                                  <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{r.report.report_text}</pre>
                                </div>
                              )}
                              {r.report?.validation && (
                                <div>
                                  <Text strong>Validation</Text>
                                  <Descriptions bordered size="small" column={1} style={{ marginTop: 8 }}>
                                    <Descriptions.Item label="Status">{r.report.validation.status}</Descriptions.Item>
                                    {Array.isArray(r.report.validation.reasons) && r.report.validation.reasons.length > 0 && (
                                      <Descriptions.Item label="Reasons">
                                        <ul style={{ paddingLeft: 16, margin: 0 }}>
                                          {r.report.validation.reasons.map((v, i3) => (
                                            <li key={i3}>{v}</li>
                                          ))}
                                        </ul>
                                      </Descriptions.Item>
                                    )}
                                  </Descriptions>
                                </div>
                              )}
                              {r.report?.metrics && (
                                <Descriptions bordered size="small" column={1}>
                                  {Object.entries(r.report.metrics).map(([k, v]) => (
                                    <Descriptions.Item key={k} label={k}>
                                      {typeof v === 'object' ? (
                                        <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{JSON.stringify(v, null, 2)}</pre>
                                      ) : (
                                        String(v)
                                      )}
                                    </Descriptions.Item>
                                  ))}
                                </Descriptions>
                              )}
                              {imageUrls && imageUrls.length > 0 && (
                                <div>
                                  <Divider style={{ margin: '8px 0' }}>Artifacts</Divider>
                                  <Image.PreviewGroup>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
                                      {imageUrls.map((url, i4) => (
                                        <AuthImage key={i4} url={url} alt={`xai-${i4}`} />
                                      ))}
                                    </div>
                                  </Image.PreviewGroup>
                                </div>
                              )}
                              <div style={{ marginTop: 12 }}>
                                <Divider orientation="center" style={{ margin: '12px 0' }}>
                                  <Text strong>Doctor Feedback</Text>
                                </Divider>
                                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                                  <Space size={8}>
                                    <Button
                                      size="small"
                                      shape="round"
                                      type={localFeedback[`${instanceId}|${r.abnormality}`]?.decision === 'approve' ? 'primary' : 'default'}
                                      style={localFeedback[`${instanceId}|${r.abnormality}`]?.decision === 'approve' ? { backgroundColor: '#52c41a', borderColor: '#52c41a', color: '#fff' } : undefined}
                                      onClick={() => setLocalFeedback(prev => ({ ...prev, [`${instanceId}|${r.abnormality}`]: { ...(prev[`${instanceId}|${r.abnormality}`] || {}), decision: 'approve' } }))}
                                    >
                                      Approve
                                    </Button>
                                    <Button
                                      size="small"
                                      shape="round"
                                      type={localFeedback[`${instanceId}|${r.abnormality}`]?.decision === 'correct' ? 'primary' : 'default'}
                                      style={localFeedback[`${instanceId}|${r.abnormality}`]?.decision === 'correct' ? { backgroundColor: '#faad14', borderColor: '#faad14', color: '#fff' } : undefined}
                                      onClick={() => setLocalFeedback(prev => ({ ...prev, [`${instanceId}|${r.abnormality}`]: { ...(prev[`${instanceId}|${r.abnormality}`] || {}), decision: 'correct' } }))}
                                    >
                                      Correct
                                    </Button>
                                  </Space>
                                  <Input.TextArea
                                    allowClear
                                    autoSize={{ minRows: 3, maxRows: 5 }}
                                    placeholder="Doctor notes"
                                    value={localFeedback[`${instanceId}|${r.abnormality}`]?.notes || ''}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      const key = `${instanceId}|${r.abnormality}`;
                                      setLocalFeedback(prev => ({ ...prev, [key]: { ...(prev[key] || {}), notes: val } }));
                                    }}
                                  />
                                  <Button
                                    size="small"
                                    type="primary"
                                    shape="round"
                                    onClick={() => {
                                      const key = `${instanceId}|${r.abnormality}`;
                                      setSubmittedFeedback(prev => ({ ...prev, [key]: { decision: localFeedback[key]?.decision || 'approve', notes: localFeedback[key]?.notes || '' } }));
                                      setLocalFeedback(prev => ({ ...prev, [key]: { ...(prev[key] || {}), notes: '' } }));
                                      message.success('Feedback recorded locally (not persisted).');
                                    }}
                                  >
                                    Submit
                                  </Button>
                                  {submittedFeedback[`${instanceId}|${r.abnormality}`] && (
                                    <div style={{ marginTop: 8 }}>
                                      <Text strong>Status:</Text> {submittedFeedback[`${instanceId}|${r.abnormality}`].decision || 'approve'}
                                      {submittedFeedback[`${instanceId}|${r.abnormality}`].notes ? (
                                        <div><Text strong>Notes:</Text> {submittedFeedback[`${instanceId}|${r.abnormality}`].notes}</div>
                                      ) : null}
                                    </div>
                                  )}
                                </Space>
                              </div>
                            </Space>
                          </Card>
                        )
                      };
                    });

                    return (
                      <Tabs
                        items={items}
                        defaultActiveKey={items.find(it => it.key === activeFromQuery)?.key || items[0]?.key}
                        onChange={(key) => {
                          const params = new URLSearchParams(location.search);
                          params.set('active', key);
                          navigate(`/xai/${instanceId}?${params.toString()}`, { replace: true });
                        }}
                      />
                    );
                  })()}
                </>
              )}
            </Space>
          ) : (
            <Alert type="error" showIcon message="No XAI data" />
          )}
        </Card>
      </Space>
      {/* Bottom doctor notes card removed per request */}
    </div>
  );
};

export default XAIResultPage;

