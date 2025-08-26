import React from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Card, Space, Typography, Button, Row, Col, Descriptions, Tag, Alert, Spin, message, Image, Divider } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import request from '../services/api/request';
import { API_ENDPOINTS } from '../services/api/config';

const { Title, Text } = Typography;

const XAIResultPage = () => {
  const { instanceId, patientId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState(location.state?.xaiData || null);

  const fetchXAI = React.useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      const searchParams = new URLSearchParams(location.search);
      const ds = searchParams.getAll('d');
      const diseases = ds.length > 0 ? ds : [];
      if (diseases.length === 0) {
        throw new Error('No abnormalities selected. Please go back and choose from predictions.');
      }
      diseases.forEach(d => params.append('disease', d));
      if (patientId) {
        // Fetch all instances for the patient, then run XAI for each
        const files = await request.get(`${API_ENDPOINTS.ECG}/patient/${patientId}/files`);
        const allInstanceIds = (files || []).flatMap(f => f.instanceIDs || []);
        const results = [];
        for (const id of allInstanceIds) {
          try {
            const res = await request.post(`${API_ENDPOINTS.ECG}/interpretation/${id}`, params.toString(), {
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });
            results.push({ instance_id: id, payload: res });
          } catch (e) {
            results.push({ instance_id: id, error: e?.message || 'XAI failed' });
          }
        }
        setData({ multi: true, items: results });
      } else {
        const res = await request.post(`${API_ENDPOINTS.ECG}/interpretation/${instanceId}`, params.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        setData(res);
      }
    } catch (e) {
      console.error(e);
      message.error(e?.message || 'Failed to load XAI results');
    } finally {
      setLoading(false);
    }
  }, [instanceId, patientId, location.search]);

  React.useEffect(() => { fetchXAI(); }, [fetchXAI]);

  return (
    <div style={{ padding: 24 }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Space align="center" style={{ justifyContent: 'space-between', width: '100%' }}>
          <Title level={2} style={{ margin: 0 }}>XAI Interpretation</Title>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>Back</Button>
            <Button onClick={fetchXAI}>Refresh</Button>
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
                  {data.items.map((it, i) => (
                    <Card key={i} title={`Instance ${it.instance_id}`}>
                      {it.error ? (
                        <Alert type="error" showIcon message={it.error} />
                      ) : (
                        <>
                          <Descriptions bordered column={1} size="small" style={{ marginBottom: 16 }}>
                            <Descriptions.Item label="Abnormalities">{(it.payload.abnormalities || []).join(', ')}</Descriptions.Item>
                            <Descriptions.Item label="Status">{it.payload.status || 'success'}</Descriptions.Item>
                            {it.payload.message && (
                              <Descriptions.Item label="Message">{it.payload.message}</Descriptions.Item>
                            )}
                          </Descriptions>
                          <Row gutter={[16, 16]}>
                            {(it.payload.results || []).map((r, idx) => {
                              const imageUrls = r.images || r.image_urls || Object.values((r.report && r.report.image_paths) || {});
                              return (
                                <Col key={idx} xs={24} md={12}>
                                  <Card size="small" title={
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <span>{r.abnormality || 'Result'}</span>
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
                                                <Image key={i2} src={url} alt={`xai-${i2}`} style={{ width: '100%', borderRadius: 4 }} />
                                              ))}
                                            </div>
                                          </Image.PreviewGroup>
                                        </div>
                                      )}
                                    </Space>
                                  </Card>
                                </Col>
                              );
                            })}
                          </Row>
                        </>
                      )}
                    </Card>
                  ))}
                </Space>
              ) : (
                <>
                  <Descriptions bordered column={1} size="small">
                    <Descriptions.Item label="Instance ID">{data.instance_id || instanceId}</Descriptions.Item>
                    {Array.isArray(data.abnormalities) && (
                      <Descriptions.Item label="Requested Abnormalities">{data.abnormalities.join(', ')}</Descriptions.Item>
                    )}
                    <Descriptions.Item label="Status">{data.status || 'success'}</Descriptions.Item>
                  </Descriptions>

                  <Divider style={{ margin: '12px 0' }} />

                  <Row gutter={[16, 16]}>
                    {(data.results || []).map((r, idx) => {
                      const imageUrls = r.images || r.image_urls || Object.values((r.report && r.report.image_paths) || {});
                      return (
                        <Col key={idx} xs={24} md={12}>
                          <Card
                            size="small"
                            title={
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>{r.abnormality || 'Result'}</span>
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
                                        <Image key={i4} src={url} alt={`xai-${i4}`} style={{ width: '100%', borderRadius: 4 }} />
                                      ))}
                                    </div>
                                  </Image.PreviewGroup>
                                </div>
                              )}
                            </Space>
                          </Card>
                        </Col>
                      );
                    })}
                  </Row>
                </>
              )}
            </Space>
          ) : (
            <Alert type="error" showIcon message="No XAI data" />
          )}
        </Card>
      </Space>
    </div>
  );
};

export default XAIResultPage;

