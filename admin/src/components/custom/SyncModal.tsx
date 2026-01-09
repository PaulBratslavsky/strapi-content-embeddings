import React, { useState, useEffect } from 'react';
import {
  Modal,
  Button,
  Flex,
  Typography,
  Box,
  Loader,
  Badge,
  Divider,
  SingleSelect,
  SingleSelectOption,
  Checkbox,
  Alert,
  Card,
  Grid,
} from '@strapi/design-system';
import { ArrowClockwise, Check, Cross, WarningCircle, Database } from '@strapi/icons';
import { useFetchClient } from '@strapi/strapi/admin';
import { syncApi, SyncStatus, SyncResult, RecreateResult } from '../../utils/api';

type SyncOperation = 'status' | 'sync' | 'recreate';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncComplete?: () => void;
}

interface StatCardProps {
  label: string;
  value: number | string;
  subtitle?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

function StatCard({ label, value, subtitle, variant = 'default' }: StatCardProps) {
  const bgColors = {
    default: 'neutral100',
    success: 'success100',
    warning: 'warning100',
    danger: 'danger100',
  };

  const textColors = {
    default: 'neutral800',
    success: 'success700',
    warning: 'warning700',
    danger: 'danger700',
  };

  return (
    <Box
      padding={4}
      background={bgColors[variant]}
      hasRadius
      borderColor="neutral200"
      style={{ textAlign: 'center', minWidth: '120px' }}
    >
      <Typography variant="pi" textColor="neutral600" style={{ textTransform: 'uppercase', fontSize: '11px' }}>
        {label}
      </Typography>
      <Box paddingTop={1}>
        <Typography variant="alpha" textColor={textColors[variant]} fontWeight="bold">
          {value}
        </Typography>
      </Box>
      {subtitle && (
        <Box paddingTop={1}>
          <Typography variant="pi" textColor="neutral500">
            {subtitle}
          </Typography>
        </Box>
      )}
    </Box>
  );
}

export function SyncModal({ isOpen, onClose, onSyncComplete }: SyncModalProps) {
  const fetchClient = useFetchClient();

  const [operation, setOperation] = useState<SyncOperation>('status');
  const [removeOrphans, setRemoveOrphans] = useState(false);
  const [dryRun, setDryRun] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [recreateResult, setRecreateResult] = useState<RecreateResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setSyncResult(null);
      setRecreateResult(null);
      setError(null);
      setOperation('status');
      setDryRun(true);
      setRemoveOrphans(false);
    }
  }, [isOpen]);

  const fetchStatus = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await syncApi.getStatus(fetchClient);
      setStatus(result);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch sync status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecute = async () => {
    setIsLoading(true);
    setError(null);
    setSyncResult(null);
    setRecreateResult(null);

    try {
      if (operation === 'status') {
        await fetchStatus();
      } else if (operation === 'sync') {
        const result = await syncApi.syncFromNeon(fetchClient, { removeOrphans, dryRun });
        setSyncResult(result);
        if (!dryRun && onSyncComplete) {
          onSyncComplete();
        }
      } else if (operation === 'recreate') {
        const result = await syncApi.recreateAll(fetchClient);
        setRecreateResult(result);
        if (onSyncComplete) {
          onSyncComplete();
        }
      }
    } catch (err: any) {
      setError(err.message || 'Operation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStatus = () => {
    if (!status) return null;

    return (
      <Card padding={5} background="neutral0" shadow="tableShadow">
        <Flex direction="column" gap={4}>
          <Flex justifyContent="space-between" alignItems="center">
            <Flex gap={2} alignItems="center">
              <Database />
              <Typography variant="delta" fontWeight="bold">
                Sync Status
              </Typography>
            </Flex>
            <Badge active={status.inSync} size="S">
              {status.inSync ? 'In Sync' : 'Out of Sync'}
            </Badge>
          </Flex>

          <Divider />

          <Flex gap={4} justifyContent="center" wrap="wrap">
            <StatCard
              label="Neon DB"
              value={status.neonCount}
              subtitle="embeddings"
            />
            <StatCard
              label="Strapi DB"
              value={status.strapiCount}
              subtitle="embeddings"
            />
          </Flex>

          {!status.inSync && (
            <>
              <Divider />
              <Box padding={3} background="warning100" hasRadius>
                <Flex direction="column" gap={2}>
                  <Typography variant="sigma" textColor="warning700">
                    Differences Found
                  </Typography>
                  {status.missingInStrapi > 0 && (
                    <Typography variant="pi" textColor="warning700">
                      • {status.missingInStrapi} embeddings missing in Strapi (will be created)
                    </Typography>
                  )}
                  {status.missingInNeon > 0 && (
                    <Typography variant="pi" textColor="danger600">
                      • {status.missingInNeon} orphaned entries in Strapi (not in Neon)
                    </Typography>
                  )}
                  {status.contentDifferences > 0 && (
                    <Typography variant="pi" textColor="warning700">
                      • {status.contentDifferences} entries with content differences
                    </Typography>
                  )}
                </Flex>
              </Box>
            </>
          )}
        </Flex>
      </Card>
    );
  };

  const renderSyncResult = () => {
    if (!syncResult) return null;

    return (
      <Card padding={5} background={syncResult.success ? 'success100' : 'danger100'} shadow="tableShadow">
        <Flex direction="column" gap={4}>
          <Flex justifyContent="space-between" alignItems="center">
            <Typography variant="delta" fontWeight="bold">
              {syncResult.dryRun ? 'Preview Results' : 'Sync Results'}
            </Typography>
            <Badge active={syncResult.success}>
              {syncResult.success ? (
                <Flex gap={1} alignItems="center">
                  <Check width={12} height={12} />
                  Success
                </Flex>
              ) : (
                <Flex gap={1} alignItems="center">
                  <Cross width={12} height={12} />
                  Failed
                </Flex>
              )}
            </Badge>
          </Flex>

          <Divider />

          <Flex gap={3} justifyContent="center" wrap="wrap">
            <StatCard
              label="Created"
              value={syncResult.actions.created}
              variant={syncResult.actions.created > 0 ? 'success' : 'default'}
            />
            <StatCard
              label="Updated"
              value={syncResult.actions.updated}
              variant={syncResult.actions.updated > 0 ? 'warning' : 'default'}
            />
            <StatCard
              label="Removed"
              value={syncResult.actions.orphansRemoved}
              variant={syncResult.actions.orphansRemoved > 0 ? 'danger' : 'default'}
            />
          </Flex>

          {syncResult.errors.length > 0 && (
            <Box padding={3} background="danger100" hasRadius>
              <Typography variant="sigma" textColor="danger700">
                Errors
              </Typography>
              <Box paddingTop={2}>
                {syncResult.errors.slice(0, 3).map((err, i) => (
                  <Typography key={i} variant="pi" textColor="danger600">
                    • {err}
                  </Typography>
                ))}
                {syncResult.errors.length > 3 && (
                  <Typography variant="pi" textColor="danger600" fontWeight="bold">
                    + {syncResult.errors.length - 3} more errors
                  </Typography>
                )}
              </Box>
            </Box>
          )}

          {syncResult.dryRun && (
            <Box paddingTop={2}>
              <Alert variant="default" closeLabel="Close">
                This was a preview. No changes were made. Click "Apply Changes" below to execute the sync.
              </Alert>
            </Box>
          )}
        </Flex>
      </Card>
    );
  };

  const renderRecreateResult = () => {
    if (!recreateResult) return null;

    return (
      <Card padding={5} background={recreateResult.success ? 'success100' : 'danger100'} shadow="tableShadow">
        <Flex direction="column" gap={4}>
          <Flex justifyContent="space-between" alignItems="center">
            <Typography variant="delta" fontWeight="bold">
              Recreate Results
            </Typography>
            <Badge active={recreateResult.success}>
              {recreateResult.success ? 'Success' : 'Failed'}
            </Badge>
          </Flex>

          <Divider />

          <Flex gap={3} justifyContent="center" wrap="wrap">
            <StatCard
              label="Processed"
              value={recreateResult.totalProcessed}
            />
            <StatCard
              label="Created"
              value={recreateResult.created}
              variant="success"
            />
            <StatCard
              label="Failed"
              value={recreateResult.failed}
              variant={recreateResult.failed > 0 ? 'danger' : 'default'}
            />
          </Flex>

          {recreateResult.errors.length > 0 && (
            <Box padding={3} background="danger100" hasRadius>
              <Typography variant="sigma" textColor="danger700">
                Errors
              </Typography>
              <Box paddingTop={2}>
                {recreateResult.errors.slice(0, 3).map((err, i) => (
                  <Typography key={i} variant="pi" textColor="danger600">
                    • {err}
                  </Typography>
                ))}
              </Box>
            </Box>
          )}
        </Flex>
      </Card>
    );
  };

  const getButtonLabel = () => {
    if (operation === 'status') return 'Refresh Status';
    if (operation === 'sync') return dryRun ? 'Preview Sync' : 'Run Sync';
    if (operation === 'recreate') return 'Recreate All';
    return 'Execute';
  };

  const handleApplyChanges = async () => {
    setIsLoading(true);
    setError(null);
    setSyncResult(null);

    try {
      const result = await syncApi.syncFromNeon(fetchClient, { removeOrphans, dryRun: false });
      setSyncResult(result);
      if (onSyncComplete) {
        onSyncComplete();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to apply changes');
    } finally {
      setIsLoading(false);
    }
  };

  const showApplyButton = syncResult?.dryRun && syncResult?.success;

  return (
    <Modal.Root open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <Modal.Content>
        <Modal.Header>
          <Flex gap={2} alignItems="center">
            <ArrowClockwise />
            <Modal.Title>Database Sync</Modal.Title>
          </Flex>
        </Modal.Header>

        <Modal.Body>
          <Flex direction="column" gap={5}>
            {error && (
              <Alert variant="danger" closeLabel="Close" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            {isLoading && !status ? (
              <Flex justifyContent="center" padding={6}>
                <Loader>Loading status...</Loader>
              </Flex>
            ) : (
              renderStatus()
            )}

            <Card padding={5} background="neutral0" shadow="tableShadow">
              <Flex direction="column" gap={4}>
                <Typography variant="delta" fontWeight="bold">
                  Select Operation
                </Typography>

                <SingleSelect
                  value={operation}
                  onChange={(value: string) => setOperation(value as SyncOperation)}
                  disabled={isLoading}
                  size="M"
                >
                  <SingleSelectOption value="status">
                    Check Status
                  </SingleSelectOption>
                  <SingleSelectOption value="sync">
                    Sync from Neon
                  </SingleSelectOption>
                  <SingleSelectOption value="recreate">
                    Recreate All (Danger)
                  </SingleSelectOption>
                </SingleSelect>

                <Typography variant="pi" textColor="neutral500">
                  {operation === 'status' && 'Compare Neon and Strapi databases without making changes.'}
                  {operation === 'sync' && 'Import embeddings from Neon DB to Strapi. Use this to restore missing entries.'}
                  {operation === 'recreate' && 'Delete all Neon embeddings and recreate them from Strapi data.'}
                </Typography>
              </Flex>
            </Card>

            {operation === 'sync' && (
              <Card padding={5} background="neutral0" shadow="tableShadow">
                <Flex direction="column" gap={4}>
                  <Typography variant="delta" fontWeight="bold">
                    Sync Options
                  </Typography>
                  <Flex direction="column" gap={3}>
                    <Checkbox
                      checked={dryRun}
                      onCheckedChange={(checked: boolean) => setDryRun(checked)}
                    >
                      <Flex direction="column">
                        <Typography variant="omega" fontWeight="semiBold">
                          Dry Run
                        </Typography>
                        <Typography variant="pi" textColor="neutral500">
                          Preview changes without applying them
                        </Typography>
                      </Flex>
                    </Checkbox>
                    <Checkbox
                      checked={removeOrphans}
                      onCheckedChange={(checked: boolean) => setRemoveOrphans(checked)}
                    >
                      <Flex direction="column">
                        <Typography variant="omega" fontWeight="semiBold">
                          Remove Orphans
                        </Typography>
                        <Typography variant="pi" textColor="neutral500">
                          Delete Strapi entries that don't exist in Neon
                        </Typography>
                      </Flex>
                    </Checkbox>
                  </Flex>
                </Flex>
              </Card>
            )}

            {operation === 'recreate' && (
              <Alert variant="danger" closeLabel="Close">
                <Flex direction="column" gap={2}>
                  <Flex gap={2} alignItems="center">
                    <WarningCircle />
                    <Typography variant="omega" fontWeight="bold">
                      Destructive Operation
                    </Typography>
                  </Flex>
                  <Typography variant="pi">
                    This will delete ALL embeddings in Neon and recreate them from Strapi data.
                    This operation cannot be undone. Only use if embeddings are corrupted.
                  </Typography>
                </Flex>
              </Alert>
            )}

            {syncResult && renderSyncResult()}
            {recreateResult && renderRecreateResult()}
          </Flex>
        </Modal.Body>

        <Modal.Footer>
          <Flex justifyContent="space-between" width="100%">
            <Modal.Close>
              <Button variant="tertiary">Cancel</Button>
            </Modal.Close>
            <Flex gap={2}>
              {showApplyButton && (
                <Button
                  onClick={handleApplyChanges}
                  loading={isLoading}
                  startIcon={<Check />}
                  variant="success"
                >
                  Apply Changes
                </Button>
              )}
              <Button
                onClick={handleExecute}
                loading={isLoading}
                startIcon={<ArrowClockwise />}
                variant={operation === 'recreate' ? 'danger' : 'secondary'}
              >
                {getButtonLabel()}
              </Button>
            </Flex>
          </Flex>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
}
