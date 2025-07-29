import { useState, useCallback } from "react"
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform, Alert } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import Button from "./ui/Button"
import { theme } from "../config/theme"
import { PLANS } from "../utils/constants"

const PaymentModal = ({ visible, onClose, onPaymentSuccess }) => {
  const [selectedPlan, setSelectedPlan] = useState(PLANS[0]?.name || "20-Min Vent")
  const [processing, setProcessing] = useState(false)

  const plans = PLANS

  
  const debugLog = useCallback(
    (action, data = {}) => {
      const timestamp = new Date().toISOString()
      console.log(`💳 [PaymentModal] ${action}`, {
        timestamp,
        selectedPlan,
        processing,
        visible,
        ...data,
      })
    },
    [selectedPlan, processing, visible],
  )

  const handlePlanSelection = useCallback(
    (planName) => {
      debugLog("plan_selected", {
        previousPlan: selectedPlan,
        newPlan: planName,
      })
      setSelectedPlan(planName)
    },
    [selectedPlan, debugLog],
  )

  const handlePayment = useCallback(async () => {
    const selectedPlanObject = plans.find((p) => p.name === selectedPlan)

    debugLog("payment_start", {
      selectedPlanObject,
      planPrice: selectedPlanObject?.price,
      planDuration: selectedPlanObject?.durationInMinutes,
    })

    setProcessing(true)

    try {
      // Simulate payment processing
      await new Promise((resolve) => setTimeout(resolve, 2000))

      debugLog("payment_success", {
        planName: selectedPlan,
        planObject: selectedPlanObject,
      })

      Alert.alert("Payment Successful", `You have successfully purchased ${selectedPlan}. Preparing your session...`, [
        {
          text: "Continue",
          onPress: () => {
            debugLog("payment_success_confirmed", {
              proceedingToSession: true,
            })
            onPaymentSuccess(selectedPlanObject) // Pass the full plan object
            // Note: onClose will be called by DashboardScreen after payment success processing
          },
        },
      ])
    } catch (error) {
      debugLog("payment_error", {
        error: error.message,
        stack: error.stack?.substring(0, 200),
      })

      console.error("Payment processing error:", error)
      Alert.alert("Payment Failed", "There was an issue processing your payment. Please try again later.")
    } finally {
      setProcessing(false)
      debugLog("payment_processing_complete")
    }
  }, [selectedPlan, onPaymentSuccess, plans, debugLog])

  const PlanCard = useCallback(
    ({ plan }) => (
      <TouchableOpacity
        style={[styles.planCard, selectedPlan === plan.name && styles.selectedPlan]}
        onPress={() => handlePlanSelection(plan.name)}
        disabled={processing}
      >
        <View style={styles.planHeader}>
          <View>
            <Text style={styles.planName}>{plan.name}</Text>
            <Text style={styles.planDescription}>{plan.description}</Text>
          </View>
          {plan.popular && (
            <View style={styles.popularBadge}>
              <Text style={styles.popularText}>Popular</Text>
            </View>
          )}
        </View>

        <View style={styles.planDetails}>
          <Text style={styles.planPrice}>{plan.price}</Text>
          <Text style={styles.planDuration}>{plan.durationInMinutes} minutes</Text>
        </View>

        {selectedPlan === plan.name && (
          <View style={styles.checkmark}>
            <Ionicons name="checkmark-circle" size={24} color={theme.colors.success} />
          </View>
        )}
      </TouchableOpacity>
    ),
    [selectedPlan, processing, handlePlanSelection],
  )

  // Log modal visibility changes
  useState(() => {
    debugLog("modal_visibility_changed", { visible })
  }, [visible])

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <LinearGradient colors={["#1a1a40", "#0f0f2e"]} style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Choose Your Plan</Text>
          <TouchableOpacity
            onPress={() => {
              debugLog("modal_close_requested")
              onClose()
            }}
            style={styles.closeButton}
            disabled={processing}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.subtitle}>Select a plan to start your anonymous vent session</Text>

          <View style={styles.plansContainer}>
            {plans.map((plan) => (
              <PlanCard key={plan.name} plan={plan} />
            ))}
          </View>

          <View style={styles.features}>
            <Text style={styles.featuresTitle}>What's included:</Text>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark" size={20} color={theme.colors.success} />
              <Text style={styles.featureText}>Anonymous voice session</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark" size={20} color={theme.colors.success} />
              <Text style={styles.featureText}>Matched with trained listener</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark" size={20} color={theme.colors.success} />
              <Text style={styles.featureText}>End-to-end encrypted</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark" size={20} color={theme.colors.success} />
              <Text style={styles.featureText}>No recording or storage</Text>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            title={processing ? "Processing..." : `Pay ${plans.find((p) => p.name === selectedPlan)?.price || "N/A"}`}
            onPress={handlePayment}
            disabled={processing}
            loading={processing}
            variant="primary"
          />

          <Text style={styles.disclaimer}>Secure payment processed by Stripe. Cancel anytime.</Text>
        </View>
      </LinearGradient>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: theme.spacing.md,
  },
  title: {
    fontSize: theme.typography.h3.fontSize,
    fontWeight: "bold",
    color: theme.colors.text.primary,
  },
  closeButton: {
    padding: theme.spacing.sm,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
  },
  subtitle: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.secondary,
    textAlign: "center",
    marginBottom: theme.spacing.xl,
    lineHeight: 22,
  },
  plansContainer: {
    marginBottom: theme.spacing.xl,
  },
  planCard: {
    backgroundColor: theme.colors.overlay,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 2,
    borderColor: "transparent",
    position: "relative",
    ...theme.shadows.small,
  },
  selectedPlan: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryTransparent,
  },
  planHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: theme.spacing.md,
  },
  planName: {
    fontSize: theme.typography.h4.fontSize,
    fontWeight: "bold",
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  planDescription: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text.secondary,
  },
  popularBadge: {
    backgroundColor: theme.colors.secondary, 
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
  },
  popularText: {
    fontSize: theme.typography.small.fontSize,
    fontWeight: "600",
    color: "#000", 
  },
  planDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  planPrice: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: "bold",
    color: theme.colors.text.primary,
  },
  planDuration: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.secondary,
  },
  checkmark: {
    position: "absolute",
    top: 15,
    right: 15,
  },
  features: {
    backgroundColor: theme.colors.overlay,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  featuresTitle: {
    fontSize: theme.typography.h4.fontSize,
    fontWeight: "bold",
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
  },
  featureText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.secondary,
    marginLeft: theme.spacing.sm,
  },
  footer: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: Platform.OS === "ios" ? 40 : 20,
    paddingTop: theme.spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  disclaimer: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text.tertiary,
    textAlign: "center",
    marginTop: theme.spacing.md,
    lineHeight: 16,
  },
})

export default PaymentModal
